import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  COAISynth,
  COAITeam,
  COAIThread,
  COAIMessage,
  COAITeamSynth,
  COAISynthData,
  COAITeamData,
  COAIThreadData,
  COAIMessageData,
  COAITeamSynthReference
} from '../types'

// ============================================================================
// Synths Hook
// ============================================================================

export function useSynths() {
  const { user } = useAuth()
  const [synths, setSynths] = useState<COAISynth[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all synths for the current user
  const loadSynths = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('coai-synths')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSynths(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load synths')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create a new synth
  const createSynth = async (synthData: COAISynthData): Promise<COAISynth | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('coai-synths')
        .insert({
          user_id: user.id,
          synth_data: synthData
        })
        .select()
        .single()

      if (error) throw error
      
      setSynths(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create synth')
      return null
    }
  }

  // Update a synth
  const updateSynth = async (synthId: string, synthData: Partial<COAISynthData>): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { data, error } = await supabase
        .from('coai-synths')
        .update({
          synth_data: synthData,
          updated_at: new Date().toISOString()
        })
        .eq('id', synthId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      
      setSynths(prev => prev.map(synth => synth.id === synthId ? data : synth))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update synth')
      return false
    }
  }

  // Delete a synth
  const deleteSynth = async (synthId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { error } = await supabase
        .from('coai-synths')
        .delete()
        .eq('id', synthId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setSynths(prev => prev.filter(synth => synth.id !== synthId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete synth')
      return false
    }
  }

  useEffect(() => {
    loadSynths()
  }, [loadSynths])

  return {
    synths,
    loading,
    error,
    createSynth,
    updateSynth,
    deleteSynth,
    refetch: loadSynths
  }
}

// ============================================================================
// Teams Hook
// ============================================================================

export function useTeams() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<COAITeam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all teams for the current user
  const loadTeams = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('coai-teams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTeams(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create a new team
  const createTeam = async (teamData: COAITeamData): Promise<COAITeam | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('coai-teams')
        .insert({
          user_id: user.id,
          team_data: teamData
        })
        .select()
        .single()

      if (error) throw error
      
      setTeams(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
      return null
    }
  }

  // Update a team
  const updateTeam = async (teamId: string, teamData: Partial<COAITeamData>): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { data, error } = await supabase
        .from('coai-teams')
        .update({
          team_data: teamData,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      
      setTeams(prev => prev.map(team => team.id === teamId ? data : team))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team')
      return false
    }
  }

  // Delete a team
  const deleteTeam = async (teamId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { error } = await supabase
        .from('coai-teams')
        .delete()
        .eq('id', teamId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setTeams(prev => prev.filter(team => team.id !== teamId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team')
      return false
    }
  }

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    refetch: loadTeams
  }
}

// ============================================================================
// Team-Synths Hook
// ============================================================================

export function useTeamSynths(teamId: string) {
  const [teamSynths, setTeamSynths] = useState<COAITeamSynth[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load synths for a specific team
  const loadTeamSynths = useCallback(async () => {
    if (!teamId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('coai-team-synths')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setTeamSynths(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team synths')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  // Add synth to team
  const addSynthToTeam = async (synthId: string | null, reference: COAITeamSynthReference): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('coai-team-synths')
        .insert({
          team_id: teamId,
          synth_id: synthId,
          synth_reference: reference
        })
        .select()
        .single()

      if (error) throw error
      
      setTeamSynths(prev => [...prev, data])
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add synth to team')
      return false
    }
  }

  // Remove synth from team
  const removeSynthFromTeam = async (teamSynthId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coai-team-synths')
        .delete()
        .eq('id', teamSynthId)

      if (error) throw error
      
      setTeamSynths(prev => prev.filter(ts => ts.id !== teamSynthId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove synth from team')
      return false
    }
  }

  useEffect(() => {
    loadTeamSynths()
  }, [loadTeamSynths])

  return {
    teamSynths,
    loading,
    error,
    addSynthToTeam,
    removeSynthFromTeam,
    refetch: loadTeamSynths
  }
}

// ============================================================================
// Threads Hook
// ============================================================================

export function useThreads() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<COAIThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all threads for the current user
  const loadThreads = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('coai-threads')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setThreads(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load threads')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create a new thread
  const createThread = async (teamId: string | null, threadData: COAIThreadData): Promise<COAIThread | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('coai-threads')
        .insert({
          user_id: user.id,
          team_id: teamId,
          thread_data: threadData
        })
        .select()
        .single()

      if (error) throw error
      
      setThreads(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread')
      return null
    }
  }

  // Update a thread
  const updateThread = async (threadId: string, threadData: Partial<COAIThreadData>): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { data, error } = await supabase
        .from('coai-threads')
        .update({
          thread_data: threadData,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      
      setThreads(prev => prev.map(thread => thread.id === threadId ? data : thread))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thread')
      return false
    }
  }

  // Delete a thread
  const deleteThread = async (threadId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const { error } = await supabase
        .from('coai-threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setThreads(prev => prev.filter(thread => thread.id !== threadId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete thread')
      return false
    }
  }

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  return {
    threads,
    loading,
    error,
    createThread,
    updateThread,
    deleteThread,
    refetch: loadThreads
  }
}

// ============================================================================
// Thread-Synths Hook
// ============================================================================

export function useThreadSynths(threadId: string) {
  const [threadSynths, setThreadSynths] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load synths for a specific thread
  const loadThreadSynths = useCallback(async () => {
    if (!threadId) {
      console.log('🔍 [useThreadSynths] No threadId provided, skipping load');
      return;
    }

    console.log('🔍 [useThreadSynths] Loading thread synths for thread:', threadId);
    setLoading(true)
    setError(null)

    try {
      const { data: threadSynths, error: threadSynthsError } = await supabase
        .from('coai-thread-synths')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (threadSynthsError) {
        console.error('🔍 [useThreadSynths] Error loading thread synths:', threadSynthsError);
        throw threadSynthsError;
      }

      console.log('🔍 [useThreadSynths] Raw thread synths from DB:', threadSynths?.length || 0, threadSynths);

      // Get custom synth details separately
      const customSynthIds = threadSynths?.filter(ts => ts.synth_id).map(ts => ts.synth_id!) || []
      console.log('🔍 [useThreadSynths] Custom synth IDs to fetch:', customSynthIds);
      
      const { data: synths } = customSynthIds.length > 0 ? await supabase
        .from('coai-synths')
        .select('*')
        .in('id', customSynthIds) : { data: [] }

      console.log('🔍 [useThreadSynths] Custom synths from DB:', synths?.length || 0);

      const mappedSynths = threadSynths?.map(threadSynth => {
        const synth = threadSynth.synth_id ? synths?.find(s => s.id === threadSynth.synth_id) : null
        const mapped = {
          threadSynthId: threadSynth.id,
          synth: synth ? {
            id: synth.id,
            name: synth.synth_data.name,
            role: synth.synth_data.role,
            age: synth.synth_data.age,
            profileImage: synth.synth_data.profileImage,
            bio: synth.synth_data.bio,
            experience: synth.synth_data.experience,
            systemPrompt: synth.synth_data.systemPrompt,
            baseModel: synth.synth_data.baseModel
          } : null,
          reference: threadSynth.synth_reference,
          isCustom: threadSynth.synth_reference.isCustom
        };
        console.log('🔍 [useThreadSynths] Mapped synth:', mapped.synth?.name || mapped.reference.synthId, mapped);
        return mapped;
      }) || []

      console.log('🔍 [useThreadSynths] Final mapped synths:', mappedSynths.length, mappedSynths.map(s => ({ 
        id: s.synth?.id || s.reference.synthId, 
        name: s.synth?.name || s.reference.metadata?.name 
      })));

      setThreadSynths(mappedSynths)
    } catch (err) {
      console.error('🔍 [useThreadSynths] Error in loadThreadSynths:', err);
      setError(err instanceof Error ? err.message : 'Failed to load thread synths')
    } finally {
      setLoading(false)
    }
  }, [threadId])

  // Add synth to thread
  const addSynthToThread = async (synthId: string | null, reference: COAITeamSynthReference): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coai-thread-synths')
        .insert({
          thread_id: threadId,
          synth_id: synthId,
          synth_reference: reference
        })
        .select()
        .single()

      if (error) throw error
      
      // Reload to get the full data with joined synth details
      await loadThreadSynths()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add synth to thread')
      return false
    }
  }

  // Remove synth from thread
  const removeSynthFromThread = async (threadSynthId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coai-thread-synths')
        .delete()
        .eq('id', threadSynthId)

      if (error) throw error
      
      setThreadSynths(prev => prev.filter(ts => ts.threadSynthId !== threadSynthId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove synth from thread')
      return false
    }
  }

  // Update thread synth reference metadata
  const updateThreadSynthReference = async (threadSynthId: string, updatedReference: COAITeamSynthReference): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coai-thread-synths')
        .update({
          synth_reference: updatedReference,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadSynthId)
        .select()
        .single()

      if (error) throw error
      
      // Reload to get the updated data
      await loadThreadSynths()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thread synth reference')
      return false
    }
  }

  useEffect(() => {
    loadThreadSynths()
  }, [loadThreadSynths])

  return {
    threadSynths,
    loading,
    error,
    addSynthToThread,
    removeSynthFromThread,
    updateThreadSynthReference,
    refetch: loadThreadSynths
  }
}

// ============================================================================
// Messages Hook
// ============================================================================

export function useMessages(threadId: string) {
  const [messages, setMessages] = useState<COAIMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load messages for a specific thread
  const loadMessages = useCallback(async () => {
    if (!threadId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('coai-messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [threadId])

  // Create a new message
  const createMessage = async (messageData: COAIMessageData): Promise<COAIMessage | null> => {
    try {
      const { data, error } = await supabase
        .from('coai-messages')
        .insert({
          thread_id: threadId,
          message_data: messageData
        })
        .select()
        .single()

      if (error) throw error
      
      setMessages(prev => [...prev, data])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create message')
      return null
    }
  }

  // Update a message
  const updateMessage = async (messageId: string, messageData: Partial<COAIMessageData>): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('coai-messages')
        .update({
          message_data: messageData
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error
      
      setMessages(prev => prev.map(message => message.id === messageId ? data : message))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update message')
      return false
    }
  }

  // Delete a message
  const deleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coai-messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error
      
      setMessages(prev => prev.filter(message => message.id !== messageId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message')
      return false
    }
  }

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!threadId) return

    const subscription = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coai-messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as COAIMessage])
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? payload.new as COAIMessage : msg
            ))
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [threadId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return {
    messages,
    loading,
    error,
    createMessage,
    updateMessage,
    deleteMessage,
    refetch: loadMessages
  }
} 