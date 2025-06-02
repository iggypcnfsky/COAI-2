import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';

import { denormalizeRecord } from '../../lib/utils/normalization';

/**
 * Hook for interacting with threads in the application
 */
export function useThreads(teamId?: string) {
  // Select state from the store
  const threads = useAppStore((state) => state.entities.threads);
  const activeThreadId = useAppStore((state) => state.ui.activeThreadId);
  const threadMessagesRelationships = useAppStore((state) => state.relationships.threadMessages);
  const isLoading = useAppStore((state) => state.ui.loadingStates.fetchThreads);
  const isSwitchingThread = useAppStore((state) => state.ui.loadingStates.switchThread);
  
  // Select actions from the store
  const fetchThreads = useAppStore((state) => state.fetchThreads);
  const getThread = useAppStore((state) => state.getThread);
  const createThread = useAppStore((state) => state.createThread);
  const updateThread = useAppStore((state) => state.updateThread);
  const deleteThread = useAppStore((state) => state.deleteThread);
  const switchThread = useAppStore((state) => state.switchThread);
  
  // Fetch threads on initial load and when teamId changes
  useEffect(() => {
    fetchThreads(teamId);
  }, [fetchThreads, teamId]);
  
  // Convert normalized threads to array
  const threadsList = useMemo(() => {
    return denormalizeRecord(threads);
  }, [threads]);
  
  // Get threads for the current team if teamId is provided
  const teamThreads = useMemo(() => {
    if (!teamId) return threadsList;
    
    // Filter threads by team_id
    return threadsList.filter(thread => {
      // Here we're making an assumption that thread.team_id exists in the Thread type
      // If it doesn't, you'll need to modify this accordingly
      return (thread as any).team_id === teamId;
    });
  }, [teamId, threadsList]);
  
  // Get active thread - fetch if not in store
  const activeThread = useMemo(() => {
    if (!activeThreadId) {
      return null;
    }
    
    if (!threads[activeThreadId]) {
      return null;
    }
    
    return threads[activeThreadId];
  }, [activeThreadId, threads]);
  
  // Get the active thread and fetch it if necessary
  useEffect(() => {
    const fetchActiveThread = async () => {
      if (!activeThreadId) {
        return;
      }
      
      // Only fetch if we don't already have it
      if (!threads[activeThreadId]) {
        try {
          const thread = await getThread(activeThreadId);
          
          // If thread is null (doesn't exist), clear the activeThreadId to prevent infinite loop
          if (!thread) {
            await switchThread(null);
          }
        } catch (error) {
          console.error('Error fetching active thread:', error);
          // If there's an error fetching the thread, clear the activeThreadId
          await switchThread(null);
        }
      }
    };
    
    fetchActiveThread();
  }, [activeThreadId, threads, getThread, switchThread]);
  
  // Helper to create a new thread
  const createNewThread = useCallback(async (title: string) => {
    try {
      const thread = await createThread(title);
      return thread;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  }, [createThread]);
  
  // Create a new thread in the current team
  const createTeamThread = useCallback(
    (title: string) => {
      return createNewThread(title);
    },
    [createNewThread]
  );
  
  // Get message count for a thread
  const getThreadMessageCount = useCallback(
    (threadId: string) => {
      return threadMessagesRelationships[threadId]?.length || 0;
    },
    [threadMessagesRelationships]
  );
  
  return {
    // State
    threads: teamId ? teamThreads : threadsList,
    activeThread,
    activeThreadId,
    isLoading,
    isSwitchingThread,
    
    // Thread actions
    fetchThreads,
    getThread,
    createThread,
    createTeamThread,
    updateThread,
    deleteThread,
    switchThread,
    
    // Helper methods
    getThreadMessageCount,
  };
} 