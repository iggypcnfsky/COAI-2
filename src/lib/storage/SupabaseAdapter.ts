import { Team, ChatMessage } from '@/types'
import { supabase } from '@/lib/supabase'
import { 
  teamToTeamData,
  chatMessageToMessageData,
  messageToChatMessage,
  createTeamWithSynths,
  createThreadWithMessages,
  getTeamWithSynths
} from '@/lib/database'
import { COAIStorageAdapter, StorageInfo } from './types'
import { employees } from '@/data/employees'

export class SupabaseAdapter implements COAIStorageAdapter {
  readonly type = 'supabase' as const
  readonly isAuthenticated = true

  constructor(private userId: string) {}

  // Teams management
  async getTeams(): Promise<Team[]> {
    try {
      const { data: coaiTeams, error } = await supabase
        .from('coai-teams')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Convert COAI teams to legacy Team format
      const teams: Team[] = []
      
      for (const coaiTeam of coaiTeams || []) {
        // Get team details with synths
        const teamDetails = await getTeamWithSynths(coaiTeam.id)
        
        // Get threads for this team
        const { data: threads, error: threadsError } = await supabase
          .from('coai-threads')
          .select('*')
          .eq('team_id', coaiTeam.id)
          .order('created_at', { ascending: false })

        if (threadsError) {
          console.warn('Error loading threads for team:', threadsError)
          continue
        }

        // Convert to legacy format
        const team: Team = {
          id: coaiTeam.id,
          name: coaiTeam.team_data.name,
          members: teamDetails.synths.map(s => ({
            id: s.synth?.id || 'external',
            name: s.synth?.name || s.reference.synthId,
            role: s.synth?.role || 'Assistant',
            profileImage: s.synth?.profileImage || '/default-avatar.png',
            model: s.synth?.baseModel || 'gpt-4o',
            systemPrompt: s.synth?.systemPrompt || ''
          })),
          messages: [],
          createdAt: new Date(coaiTeam.created_at),
          isActive: coaiTeam.team_data.metadata?.isActive || false
        }

        // Aggregate messages from all threads
        for (const thread of threads || []) {
          const { data: threadMessages, error: threadMessagesError } = await supabase
            .from('coai-messages')
            .select('*')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: true })

          if (!threadMessagesError && threadMessages) {
            const messages = threadMessages.map(messageToChatMessage)
            team.messages.push(...messages)
          }
        }

        // Sort messages by timestamp
        team.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        
        teams.push(team)
      }

      return teams
    } catch (error) {
      console.error('SupabaseAdapter: Error getting teams:', error)
      return []
    }
  }

  async createTeam(team: Team): Promise<Team> {
    try {
      // Convert legacy team to COAI format
      const teamData = teamToTeamData(team)
      
      // Convert team members to synth references
      // Legacy team members have string IDs that are not UUIDs
      // We need to map them correctly for COAI format
      const synthReferences = team.members.map(member => {
        // Check if this is a built-in synth (non-UUID string ID)
        const isBuiltInSynth = /^\d+$/.test(member.id) || member.id === 'external'
        
        return {
          synthId: member.id, // Keep the original ID (legacy ID for built-in, UUID for custom)
          isCustom: !isBuiltInSynth,
          metadata: {
            model: member.model,
            systemPrompt: member.systemPrompt,
            originalMemberId: member.id, // Keep track of original ID for reference
            name: member.name,
            role: member.role,
            profileImage: member.profileImage
          }
        }
      })

      // Create team with synths
      const coaiTeam = await createTeamWithSynths(this.userId, teamData, synthReferences)
      
      // Create initial thread if there are messages
      if (team.messages.length > 0) {
        const threadData = {
          title: `${team.name} Conversation`,
          isActive: team.isActive,
          metadata: {
            originalTeamId: team.id
          }
        }

        const messageData = team.messages.map(chatMessageToMessageData)
        await createThreadWithMessages(this.userId, coaiTeam.id, threadData, messageData)
      }

      // Return the created team in legacy format
      return {
        ...team,
        id: coaiTeam.id
      }
    } catch (error) {
      console.error('SupabaseAdapter: Error creating team:', error)
      throw new Error('Failed to create team in Supabase')
    }
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    try {
      // Build update data
      const updateData: any = {}
      
      if (updates.name) updateData.name = updates.name
      if (updates.isActive !== undefined) {
        updateData.metadata = { isActive: updates.isActive }
      }

      const { error } = await supabase
        .from('coai-teams')
        .update({
          team_data: updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw error

      // Return updated team
      const teams = await this.getTeams()
      const updatedTeam = teams.find(t => t.id === teamId)
      
      if (!updatedTeam) {
        throw new Error('Updated team not found')
      }

      return updatedTeam
    } catch (error) {
      console.error('SupabaseAdapter: Error updating team:', error)
      throw new Error('Failed to update team in Supabase')
    }
  }

  async deleteTeam(teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('coai-teams')
        .delete()
        .eq('id', teamId)
        .eq('user_id', this.userId)

      if (error) throw error

      // Clear active team if it was deleted
      const activeTeamId = await this.getActiveTeamId()
      if (activeTeamId === teamId) {
        await this.setActiveTeamId(null)
      }
    } catch (error) {
      console.error('SupabaseAdapter: Error deleting team:', error)
      throw new Error('Failed to delete team from Supabase')
    }
  }

  // Threads management (individual chats/conversations)
  async getThreads(): Promise<Team[]> {
    try {
      // Get all threads for the user, ordered by most recent
      const { data: threads, error } = await supabase
        .from('coai-threads')
        .select('*')
        .eq('user_id', this.userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Convert each thread to a legacy Team format for UI compatibility
      const threadTeams: Team[] = []
      
      for (const thread of threads || []) {
        // Get messages for this specific thread
        const { data: threadMessages, error: messagesError } = await supabase
          .from('coai-messages')
          .select('*')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.warn('Error loading messages for thread:', messagesError)
          continue
        }

        // Get thread synths (actual participants in the conversation)
        let teamMembers: any[] = []
        try {
          // Load thread synths
          const { data: threadSynths, error: threadSynthsError } = await supabase
            .from('coai-thread-synths')
            .select('*')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: true })

          if (threadSynthsError) {
            console.warn('Error loading thread synths:', threadSynthsError)
          } else if (threadSynths && threadSynths.length > 0) {
            // Get custom synth details
            const customSynthIds = threadSynths.filter(ts => ts.synth_id).map(ts => ts.synth_id!)
            const { data: customSynths } = customSynthIds.length > 0 ? await supabase
              .from('coai-synths')
              .select('*')
              .in('id', customSynthIds) : { data: [] }

            // Convert thread synths to team members
            teamMembers = threadSynths.map(threadSynth => {
              const customSynth = threadSynth.synth_id ? customSynths?.find(s => s.id === threadSynth.synth_id) : null
              
              if (customSynth) {
                // Custom synth with full data
                return {
                  id: customSynth.id,
                  name: customSynth.synth_data.name,
                  role: customSynth.synth_data.role,
                  profileImage: customSynth.synth_data.profileImage,
                  model: threadSynth.synth_reference.metadata?.model || customSynth.synth_data.baseModel || 'gpt-4o',
                  systemPrompt: threadSynth.synth_reference.metadata?.systemPrompt || customSynth.synth_data.systemPrompt || ''
                }
                             } else {
                 // Built-in synth from reference metadata
                 // Fall back to employees data if metadata is missing profile image
                 const employee = employees.find(e => e.id === threadSynth.synth_reference.synthId)
                 return {
                   id: threadSynth.synth_reference.synthId,
                   name: threadSynth.synth_reference.metadata?.name || employee?.name || 'Unknown',
                   role: threadSynth.synth_reference.metadata?.role || employee?.role || 'Assistant',
                   profileImage: threadSynth.synth_reference.metadata?.profileImage || employee?.profileImage || '/default-avatar.png',
                   model: threadSynth.synth_reference.metadata?.model || employee?.baseModel || 'gpt-4o',
                   systemPrompt: threadSynth.synth_reference.metadata?.systemPrompt || employee?.systemPrompt || ''
                 }
               }
            })
          }
        } catch (error) {
          console.warn('Error loading thread synths for thread:', error)
        }

        // Create a Team object representing this thread/chat
        const threadAsTeam: Team = {
          id: thread.id, // Use thread ID as the team ID for UI
          name: thread.thread_data.title || `Chat ${new Date(thread.created_at).toLocaleDateString()}`,
          members: teamMembers,
          messages: threadMessages ? threadMessages.map(messageToChatMessage) : [],
          createdAt: new Date(thread.created_at),
          isActive: thread.thread_data.isActive || false
        }
        
        threadTeams.push(threadAsTeam)
      }

      return threadTeams
    } catch (error) {
      console.error('SupabaseAdapter: Error getting threads:', error)
      return []
    }
  }

  async createThread(title: string): Promise<string> {
    try {
      const threadData = {
        title: title,
        isActive: true,
        metadata: {}
      }

      const { data: thread, error } = await supabase
        .from('coai-threads')
        .insert({
          user_id: this.userId,
          thread_data: threadData
        })
        .select()
        .single()

      if (error) throw error

      console.log('🧵 Created new thread:', thread.id)
      return thread.id
    } catch (error) {
      console.error('SupabaseAdapter: Error creating thread:', error)
      throw new Error('Failed to create thread in Supabase')
    }
  }

  async updateThread(threadId: string, updates: { title?: string; isActive?: boolean }): Promise<void> {
    try {
      // Get current thread data
      const { data: currentThread, error: getError } = await supabase
        .from('coai-threads')
        .select('thread_data')
        .eq('id', threadId)
        .eq('user_id', this.userId)
        .single()

      if (getError) throw getError

      // Merge updates with existing data
      const updatedThreadData = {
        ...currentThread.thread_data,
        ...updates
      }

      const { error } = await supabase
        .from('coai-threads')
        .update({
          thread_data: updatedThreadData,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
        .eq('user_id', this.userId)

      if (error) throw error

      console.log('✅ Thread updated in Supabase:', threadId, updates)
    } catch (error) {
      console.error('SupabaseAdapter: Error updating thread:', error)
      throw new Error('Failed to update thread in Supabase')
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      // First delete all messages in the thread (due to foreign key constraints)
      const { error: messagesError } = await supabase
        .from('coai-messages')
        .delete()
        .eq('thread_id', threadId)

      if (messagesError) {
        console.warn('Error deleting thread messages:', messagesError)
      }

      // Then delete the thread itself
      const { error: threadError } = await supabase
        .from('coai-threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', this.userId)

      if (threadError) throw threadError

      // Clear active thread if it was deleted
      const activeThreadId = await this.getActiveThreadId() // Keep method name for compatibility
      if (activeThreadId === threadId) {
        await this.setActiveThreadId(null)
      }

      console.log('✅ Thread deleted from Supabase:', threadId)
    } catch (error) {
      console.error('SupabaseAdapter: Error deleting thread:', error)
      throw new Error('Failed to delete thread from Supabase')
    }
  }

  // Messages management
  async getMessages(threadId?: string): Promise<ChatMessage[]> {
    try {
      if (threadId) {
        // Get messages for specific thread
        const { data: coaiMessages, error } = await supabase
          .from('coai-messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })

        if (error) throw error

        return (coaiMessages || []).map(messageToChatMessage)
      } else {
        // Get all messages for user
        const { data: threads, error } = await supabase
          .from('coai-threads')
          .select('id')
          .eq('user_id', this.userId)

        if (error) throw error

        const messages: ChatMessage[] = []
        for (const thread of threads || []) {
          const { data: coaiMessages, error: messagesError } = await supabase
            .from('coai-messages')
            .select('*')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: true })

          if (!messagesError && coaiMessages) {
            const threadMessages = coaiMessages.map(messageToChatMessage)
            messages.push(...threadMessages)
          }
        }

        return messages
      }
    } catch (error) {
      console.error('SupabaseAdapter: Error getting messages:', error)
      return []
    }
  }

  async createMessage(message: ChatMessage, threadId: string): Promise<ChatMessage> {
    try {
      // threadId is now required - no more auto-creating threads

      // Create message
      const messageData = chatMessageToMessageData(message)
      const { data, error } = await supabase
        .from('coai-messages')
        .insert({
          thread_id: threadId,
          message_data: messageData
        })
        .select()
        .single()

      if (error) throw error

      return messageToChatMessage(data)
    } catch (error) {
      console.error('SupabaseAdapter: Error creating message:', error)
      throw new Error('Failed to create message in Supabase')
    }
  }

  async updateMessage(messageId: string, updates: Partial<ChatMessage>): Promise<ChatMessage> {
    try {
      // Get current message to merge updates
      const { data: currentMessage, error: getError } = await supabase
        .from('coai-messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (getError) throw getError

      // Merge updates
      const currentData = messageToChatMessage(currentMessage)
      const updatedMessage = { ...currentData, ...updates }
      const updatedData = chatMessageToMessageData(updatedMessage)

      const { data, error } = await supabase
        .from('coai-messages')
        .update({
          message_data: updatedData
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error

      return messageToChatMessage(data)
    } catch (error) {
      console.error('SupabaseAdapter: Error updating message:', error)
      throw new Error('Failed to update message in Supabase')
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('coai-messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error
    } catch (error) {
      console.error('SupabaseAdapter: Error deleting message:', error)
      throw new Error('Failed to delete message from Supabase')
    }
  }

  // State management
  async getActiveTeamId(): Promise<string | null> {
    try {
      // Store active team in user profile metadata
      const { data, error } = await supabase
        .from('coai-profiles')
        .select('profile_data')
        .eq('user_id', this.userId)
        .single()

      if (error) throw error

      return data?.profile_data?.metadata?.activeTeamId || null
    } catch (error) {
      console.error('SupabaseAdapter: Error getting active team ID:', error)
      return null
    }
  }

  async setActiveTeamId(teamId: string | null): Promise<void> {
    try {
      // Update user profile metadata
      const { error } = await supabase
        .from('coai-profiles')
        .update({
          profile_data: {
            metadata: {
              activeTeamId: teamId
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)

      if (error) throw error
    } catch (error) {
      console.error('SupabaseAdapter: Error setting active team ID:', error)
      throw new Error('Failed to set active team ID in Supabase')
    }
  }

  async getActiveThreadId(): Promise<string | null> {
    try {
      // Store active thread in user profile metadata
      const { data, error } = await supabase
        .from('coai-profiles')
        .select('profile_data')
        .eq('user_id', this.userId)
        .single()

      if (error) throw error

      return data?.profile_data?.metadata?.activeThreadId || null
    } catch (error) {
      console.error('SupabaseAdapter: Error getting active thread ID:', error)
      return null
    }
  }

  async setActiveThreadId(threadId: string | null): Promise<void> {
    try {
      // Update user profile metadata
      const { error } = await supabase
        .from('coai-profiles')
        .update({
          profile_data: {
            metadata: {
              activeThreadId: threadId
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)

      if (error) throw error
    } catch (error) {
      console.error('SupabaseAdapter: Error setting active thread ID:', error)
      throw new Error('Failed to set active thread ID in Supabase')
    }
  }

  // Data management

  async clearData(): Promise<void> {
    try {
      // Delete all user data in correct order (due to foreign key constraints)
      // First get thread IDs
      const { data: userThreads } = await supabase
        .from('coai-threads')
        .select('id')
        .eq('user_id', this.userId)

      const threadIds = userThreads?.map(t => t.id) || []

      if (threadIds.length > 0) {
        const { error: messagesError } = await supabase
          .from('coai-messages')
          .delete()
          .in('thread_id', threadIds)

        if (messagesError) console.warn('Error clearing messages:', messagesError)
      }

      const { error: threadsError } = await supabase
        .from('coai-threads')
        .delete()
        .eq('user_id', this.userId)

      if (threadsError) console.warn('Error clearing threads:', threadsError)

      const { error: teamsError } = await supabase
        .from('coai-teams')
        .delete()
        .eq('user_id', this.userId)

      if (teamsError) console.warn('Error clearing teams:', teamsError)

      const { error: synthsError } = await supabase
        .from('coai-synths')
        .delete()
        .eq('user_id', this.userId)

      if (synthsError) console.warn('Error clearing synths:', synthsError)

      console.log('SupabaseAdapter: Cleared all COAI data')
    } catch (error) {
      console.error('SupabaseAdapter: Error clearing data:', error)
      throw new Error('Failed to clear Supabase data')
    }
  }

  // Health checks
  async isHealthy(): Promise<boolean> {
    try {
      // Test database connection
      const { error } = await supabase
        .from('coai-profiles')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1)

      return !error
    } catch (error) {
      console.error('SupabaseAdapter: Health check failed:', error)
      return false
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      // Estimate storage usage by counting records
      const { count: teamsCount } = await supabase
        .from('coai-teams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)

      // Get thread IDs first for message count
      const { data: userThreads } = await supabase
        .from('coai-threads')
        .select('id')
        .eq('user_id', this.userId)

      const threadIds = userThreads?.map(t => t.id) || []
      
      let messagesCount = 0
      if (threadIds.length > 0) {
        const { count } = await supabase
          .from('coai-messages')
          .select('*', { count: 'exact', head: true })
          .in('thread_id', threadIds)
        messagesCount = count || 0
      }

      // Rough estimation: 1KB per team, 500 bytes per message
      const estimatedUsage = (teamsCount || 0) * 1024 + (messagesCount || 0) * 512

      return {
        type: 'supabase',
        used: estimatedUsage,
        available: 1024 * 1024 * 1024, // 1GB estimate
        healthy: true,
        warnings: []
      }
    } catch (error) {
      console.error('SupabaseAdapter: Error getting storage info:', error)
      return {
        type: 'supabase',
        used: 0,
        available: 0,
        healthy: false,
        warnings: ['Error retrieving storage information']
      }
    }
  }
} 