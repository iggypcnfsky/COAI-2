import { useCallback, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';

import { useThreads } from './useThreads';
import { COAISynth } from '../../types';

/**
 * Hook for managing synths associated with the active thread
 */
export function useThreadSynths() {
  // Get store access for entities and relationships
  const synths = useAppStore((state) => state.entities?.synths);
  const activeThreadId = useAppStore((state) => state.ui?.activeThreadId);
  const threadSynthsRelationships = useAppStore((state) => state.relationships?.threadSynths);
  
  // Get threads hook
  const { activeThread } = useThreads();
  
  // Get synths for the active thread from the threadSynths relationship
  const threadSynths = useMemo(() => {
    console.log('🔍 DEBUG [useThreadSynths]: activeThreadId:', activeThreadId);
    console.log('🔍 DEBUG [useThreadSynths]: threadSynthsRelationships:', threadSynthsRelationships);
    console.log('🔍 DEBUG [useThreadSynths]: synths entities:', synths ? Object.keys(synths).length : 'null');
    
    if (!activeThreadId || !threadSynthsRelationships || !threadSynthsRelationships[activeThreadId] || !synths) {
      console.log('🔍 DEBUG [useThreadSynths]: Early return - missing data');
      return [];
    }
    
    const synthIds = threadSynthsRelationships[activeThreadId];
    console.log('🔍 DEBUG [useThreadSynths]: synthIds for thread:', synthIds);
    
    const foundSynths = synthIds.map((id) => {
      const synth = synths[id];
      console.log('🔍 DEBUG [useThreadSynths]: Looking for synth:', id, 'found:', !!synth);
      return synth;
    }).filter(Boolean);
    
    console.log('🔍 DEBUG [useThreadSynths]: Final foundSynths:', foundSynths.length);
    return foundSynths;
  }, [activeThreadId, threadSynthsRelationships, synths]);
  
  // Get a specific synth from the thread by ID
  const getThreadSynth = useCallback(
    (synthId: string): COAISynth | null => {
      if (!synths || !synthId) {
        return null;
      }
      return synths[synthId] || null;
    },
    [synths]
  );
  
  // Check if there's an active thread
  const hasActiveThread = !!activeThreadId;
  
  return {
    // State
    threadSynths,
    activeThread,
    hasActiveThread,
    
    // Helper methods
    getThreadSynth,
  };
} 