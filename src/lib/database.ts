import { supabase } from './supabase'
import {
  AIEmployee,
  Team,
  ChatMessage,
  COAISynthData,
  COAITeamData,
  COAIThreadData,
  COAIMessageData,
  COAISynth,
  COAITeam,
  COAIMessage,
  COAIThread,
  COAITeamSynthReference
} from '../types'

// =============================================================================
// Conversion Utilities - Legacy to COAI Database Types
// =============================================================================

/**
 * Convert legacy AIEmployee to COAISynthData for database storage
 */
export function aiEmployeeToSynthData(employee: AIEmployee): COAISynthData {
  return {
    name: employee.name,
    role: employee.role,
    age: employee.age,
    profileImage: employee.profileImage,
    bio: employee.bio,
    experience: employee.experience,
    systemPrompt: employee.systemPrompt,
    baseModel: employee.baseModel,
    metadata: {}
  }
}

/**
 * Convert COAISynth database record to legacy AIEmployee format
 */
export function synthToAIEmployee(synth: COAISynth): AIEmployee {
  return {
    id: synth.id,
    name: synth.synth_data.name,
    role: synth.synth_data.role,
    age: synth.synth_data.age,
    profileImage: synth.synth_data.profileImage,
    bio: synth.synth_data.bio,
    experience: synth.synth_data.experience,
    systemPrompt: synth.synth_data.systemPrompt,
    baseModel: synth.synth_data.baseModel
  }
}

/**
 * Convert legacy Team to COAITeamData for database storage
 */
export function teamToTeamData(team: Team): COAITeamData {
  return {
    name: team.name,
    description: `Team with ${team.members.length} members`,
    teamType: 'custom',
    
    metadata: {
      isActive: team.isActive,
      originalId: team.id
    }
  }
}

/**
 * Convert legacy ChatMessage to COAIMessageData for database storage
 */
export function chatMessageToMessageData(message: ChatMessage): COAIMessageData {
  return {
    content: message.content,
    sender: message.sender,
    aiEmployee: message.aiEmployee,
    image: message.image,
    isLoading: message.isLoading,
    metadata: {
      originalId: message.id,
      timestamp: message.timestamp.toISOString()
    }
  }
}

/**
 * Convert COAIMessage database record to legacy ChatMessage format
 */
export function messageToChatMessage(message: COAIMessage): ChatMessage {
  return {
    id: message.id,
    content: message.message_data.content,
    sender: message.message_data.sender,
    timestamp: message.message_data.metadata?.timestamp 
      ? new Date(message.message_data.metadata.timestamp)
      : new Date(message.created_at),
    aiEmployee: message.message_data.aiEmployee,
    isLoading: message.message_data.isLoading,
    image: message.message_data.image
  }
}

// =============================================================================
// Database Helper Functions
// =============================================================================

/**
 * Get a synth with team membership information
 */
export async function getSynthWithTeams(synthId: string) {
  const { data: synth } = await supabase
    .from('coai-synths')
    .select('*')
    .eq('id', synthId)
    .single()

  const { data: teamMemberships } = await supabase
    .from('coai-team-synths')
    .select('*')
    .eq('synth_id', synthId)

  // Get team details separately
  const teamIds = teamMemberships?.map(tm => tm.team_id) || []
  const { data: teams } = teamIds.length > 0 ? await supabase
    .from('coai-teams')
    .select('*')
    .in('id', teamIds) : { data: [] }

  return {
    synth,
    teams: teamMemberships?.map(membership => {
      const team = teams?.find(t => t.id === membership.team_id)
      return {
        teamId: membership.team_id,
        teamName: team?.team_data.name || 'Unknown',
        reference: membership.synth_reference
      }
    }) || []
  }
}

/**
 * Get a team with all its synths populated
 */
export async function getTeamWithSynths(teamId: string) {
  const { data: team } = await supabase
    .from('coai-teams')
    .select('*')
    .eq('id', teamId)
    .single()

  const { data: teamSynths } = await supabase
    .from('coai-team-synths')
    .select('*')
    .eq('team_id', teamId)

  // Get synth details separately for custom synths
  const customSynthIds = teamSynths?.filter(ts => ts.synth_id).map(ts => ts.synth_id!) || []
  const { data: synths } = customSynthIds.length > 0 ? await supabase
    .from('coai-synths')
    .select('*')
    .in('id', customSynthIds) : { data: [] }

  return {
    team,
    synths: teamSynths?.map(teamSynth => {
      const synth = teamSynth.synth_id ? synths?.find(s => s.id === teamSynth.synth_id) : null
      return {
        teamSynthId: teamSynth.id,
        synth: synth ? synthToAIEmployee(synth) : null,
        reference: teamSynth.synth_reference,
        isCustom: teamSynth.synth_reference.isCustom
      }
    }) || []
  }
}

/**
 * Get a thread with its messages and team information
 */
export async function getThreadWithDetails(threadId: string) {
  const { data: thread } = await supabase
    .from('coai-threads')
    .select(`
      *,
      coai-teams (
        id,
        team_data
      )
    `)
    .eq('id', threadId)
    .single()

  const { data: messages } = await supabase
    .from('coai-messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  return {
    thread,
    team: (thread as any)?.['coai-teams'] || null,
    messages: messages?.map(messageToChatMessage) || []
  }
}

/**
 * Create a team with synths in a single transaction
 */
export async function createTeamWithSynths(
  userId: string,
  teamData: COAITeamData,
  synthReferences: COAITeamSynthReference[]
) {
  // Start a transaction-like operation
  const { data: team, error: teamError } = await supabase
    .from('coai-teams')
    .insert({
      user_id: userId,
      team_data: teamData
    })
    .select()
    .single()

  if (teamError || !team) {
    throw new Error(`Failed to create team: ${teamError?.message}`)
  }

  // Add synths to the team
  const teamSynthInserts = synthReferences.map(reference => ({
    team_id: team.id,
    synth_id: reference.isCustom ? reference.synthId : null,
    synth_reference: reference
  }))

  const { error: synthsError } = await supabase
    .from('coai-team-synths')
    .insert(teamSynthInserts)

  if (synthsError) {
    // Cleanup: delete the team if synth insertion failed
    await supabase
      .from('coai-teams')
      .delete()
      .eq('id', team.id)
    
    throw new Error(`Failed to add synths to team: ${synthsError.message}`)
  }

  return team
}

/**
 * Migrate a legacy team to the database
 */
export async function migrateLegacyTeam(
  userId: string,
  legacyTeam: Team,
  customSynths: COAISynth[]
): Promise<COAITeam> {
  // Create team data
  const teamData = teamToTeamData(legacyTeam)
  
  // Map team members to synth references
  const synthReferences: COAITeamSynthReference[] = legacyTeam.members.map(member => {
    // Try to find a matching custom synth
    const customSynth = customSynths.find(synth => 
      synth.synth_data.name === member.name &&
      synth.synth_data.role === member.role
    )

    return {
      synthId: customSynth?.id || member.id,
      isCustom: !!customSynth,
      metadata: {
        model: member.model,
        systemPrompt: member.systemPrompt,
        originalMemberId: member.id
      }
    }
  })

  return createTeamWithSynths(userId, teamData, synthReferences)
}

/**
 * Create a thread with initial messages
 */
export async function createThreadWithMessages(
  userId: string,
  teamId: string | null,
  threadData: COAIThreadData,
  initialMessages: COAIMessageData[]
): Promise<COAIThread> {
  // Create the thread
  const { data: thread, error: threadError } = await supabase
    .from('coai-threads')
    .insert({
      user_id: userId,
      team_id: teamId,
      thread_data: threadData
    })
    .select()
    .single()

  if (threadError || !thread) {
    throw new Error(`Failed to create thread: ${threadError?.message}`)
  }

  // Add initial messages if provided
  if (initialMessages.length > 0) {
    const messageInserts = initialMessages.map(messageData => ({
      thread_id: thread.id,
      message_data: messageData
    }))

    const { error: messagesError } = await supabase
      .from('coai-messages')
      .insert(messageInserts)

    if (messagesError) {
      console.error('Failed to add initial messages:', messagesError.message)
      // Don't throw here - thread creation succeeded
    }
  }

  return thread
}

/**
 * Add a synth to a thread
 */
export async function addSynthToThread(
  threadId: string,
  synthId: string | null, // null for built-in synths
  synthReference: COAITeamSynthReference
) {
  const { data, error } = await supabase
    .from('coai-thread-synths')
    .insert({
      thread_id: threadId,
      synth_id: synthId,
      synth_reference: synthReference
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add synth to thread: ${error.message}`)
  }

  return data
}

/**
 * Remove a synth from a thread
 */
export async function removeSynthFromThread(threadId: string, synthId: string) {
  const { error } = await supabase
    .from('coai-thread-synths')
    .delete()
    .eq('thread_id', threadId)
    .eq('synth_id', synthId)

  if (error) {
    throw new Error(`Failed to remove synth from thread: ${error.message}`)
  }
}

/**
 * Get all synths for a thread
 */
export async function getThreadSynths(threadId: string) {
  const { data: threadSynths } = await supabase
    .from('coai-thread-synths')
    .select('*')
    .eq('thread_id', threadId)

  // Get custom synth details separately
  const customSynthIds = threadSynths?.filter(ts => ts.synth_id).map(ts => ts.synth_id!) || []
  const { data: synths } = customSynthIds.length > 0 ? await supabase
    .from('coai-synths')
    .select('*')
    .in('id', customSynthIds) : { data: [] }

  return threadSynths?.map(threadSynth => {
    const synth = threadSynth.synth_id ? synths?.find(s => s.id === threadSynth.synth_id) : null
    return {
      threadSynthId: threadSynth.id,
      synth: synth ? synthToAIEmployee(synth) : null,
      reference: threadSynth.synth_reference,
      isCustom: threadSynth.synth_reference.isCustom
    }
  }) || []
}

/**
 * Update thread synths (replace all synths for a thread)
 */
export async function updateThreadSynths(
  threadId: string,
  synthReferences: COAITeamSynthReference[]
) {
  // First, remove all existing synths for this thread
  await supabase
    .from('coai-thread-synths')
    .delete()
    .eq('thread_id', threadId)

  // Then add the new synths
  if (synthReferences.length > 0) {
    const threadSynthInserts = synthReferences.map(reference => ({
      thread_id: threadId,
      synth_id: reference.isCustom ? reference.synthId : null,
      synth_reference: reference
    }))

    const { error } = await supabase
      .from('coai-thread-synths')
      .insert(threadSynthInserts)

    if (error) {
      throw new Error(`Failed to update thread synths: ${error.message}`)
    }
  }
}

/**
 * Bulk operations for performance
 */
export const bulk = {
  /**
   * Create multiple synths at once
   */
  createSynths: async (userId: string, synthsData: COAISynthData[]) => {
    const inserts = synthsData.map(synthData => ({
      user_id: userId,
      synth_data: synthData
    }))

    return supabase
      .from('coai-synths')
      .insert(inserts)
      .select()
  },

  /**
   * Create multiple messages at once
   */
  createMessages: async (threadId: string, messagesData: COAIMessageData[]) => {
    const inserts = messagesData.map(messageData => ({
      thread_id: threadId,
      message_data: messageData
    }))

    return supabase
      .from('coai-messages')
      .insert(inserts)
      .select()
  }
} 