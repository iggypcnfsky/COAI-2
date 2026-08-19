import { StateCreator } from 'zustand';
import { RootState } from '../../types/store';
import { Thread, COAITeamSynth, COAITeamSynthReference } from '../../types';
import { normalizeArray, removeEntity, addRelationship, removeRelationship, removeAllRelationships } from '../../lib/utils/normalization';
import { httpDataService } from '../../lib/services/dataService';
import { LoadingStateKey } from '../../types/store';
import { directService } from '../../lib/services/directService';

export interface ThreadsState {
  // Actions
  fetchThreads: (teamId?: string) => Promise<void>;
  getThread: (id: string) => Promise<Thread | null>;
  createThread: (title: string) => Promise<Thread>;
  updateThread: (id: string, updates: Partial<Thread>) => Promise<Thread>;
  deleteThread: (id: string) => Promise<void>;
  switchThread: (id: string | null) => Promise<void>;
  
  // Thread-Synth relationship actions
  addSynthToThread: (threadId: string, synthId: string, reference: COAITeamSynthReference) => Promise<void>;
  removeSynthFromThread: (threadId: string, synthId: string) => Promise<void>;
  getThreadSynths: (threadId: string) => Promise<COAITeamSynth[]>;
  updateThreadSynthReference: (threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>) => Promise<void>;
}

export const createThreadsSlice: StateCreator<
  RootState,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  ThreadsState
> = (set, get) => ({
  // Actions
  fetchThreads: async (_teamId?: string) => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.FETCH_THREADS]: true
        }
      }
    }), false, 'threads/fetchThreads/start');
    
    try {
      const threads = await httpDataService.fetchThreads();
      const processedThreads: Thread[] = threads;
      
      // Normalize threads by ID
      const normalizedThreads = normalizeArray(processedThreads);
      
      // Update state with normalized threads
      set((state) => ({
        entities: {
          ...state.entities,
          threads: normalizedThreads
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_THREADS]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_THREADS]: null
          }
        }
      }), false, 'threads/fetchThreads/success');
    } catch (error) {
      console.error('Error fetching threads:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_THREADS]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_THREADS]: error as Error
          }
        }
      }), false, 'threads/fetchThreads/error');
    }
  },
  
  getThread: async (id: string) => {
    const { entities } = get();
    
    // Return from cache if available
    if (entities.threads[id]) return entities.threads[id];
    
    try {
      const thread = await httpDataService.getThread(id);
      if (!thread) return null;
      
      // Update store with fetched thread
      set((state) => ({
        entities: {
          ...state.entities,
          threads: {
            ...state.entities.threads,
            [id]: thread
          }
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getThread: null
          }
        }
      }), false, 'threads/getThread/success');
      
      return thread;
    } catch (error) {
      console.error(`Error fetching thread ${id}:`, error);
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getThread: error as Error
          }
        }
      }), false, 'threads/getThread/error');
      return null;
    }
  },
  
  createThread: async (title: string) => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.CREATE_THREAD]: true
        }
      }
    }), false, 'threads/createThread/start');
    
    try {
      const newThread = await httpDataService.createThread(title || 'Untitled Thread');
      
      // Update store with new thread
      set((state) => ({
        entities: {
          ...state.entities,
          threads: {
            ...state.entities.threads,
            [newThread.id]: newThread
          }
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_THREAD]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_THREAD]: null
          }
        }
      }), false, 'threads/createThread/success');
      
      // Automatically switch to the new thread
      await get().switchThread(newThread.id);
      
      return newThread;
    } catch (error) {
      console.error('Error creating thread:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_THREAD]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_THREAD]: error as Error
          }
        }
      }), false, 'threads/createThread/error');
      throw error;
    }
  },
  
  updateThread: async (id: string, updates: Partial<Thread>) => {
    const { entities } = get();
    
    // Get current thread
    const currentThread = entities.threads[id];
    if (!currentThread) {
      throw new Error(`Thread with id ${id} not found`);
    }
    
    // Apply optimistic update
    const updatedThread = { 
      ...currentThread,
      ...updates,
      updatedAt: new Date()
    };
    
    set((state) => ({
      entities: {
        ...state.entities,
        threads: {
          ...state.entities.threads,
          [id]: updatedThread
        }
      }
    }), false, 'threads/updateThread/optimistic');
    
    try {
      // Convert frontend thread format to database format
      await httpDataService.updateThread(id, updates);
      
      // Success - optimistic update was correct
      return updatedThread;
    } catch (error) {
      console.error(`Error updating thread ${id}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        entities: {
          ...state.entities,
          threads: {
            ...state.entities.threads,
            [id]: currentThread
          }
        }
      }), false, 'threads/updateThread/revert');
      
      throw error;
    }
  },
  
  deleteThread: async (id: string) => {
    const { entities, relationships } = get();
    
    // Get current thread
    const currentThread = entities.threads[id];
    if (!currentThread) {
      throw new Error(`Thread with id ${id} not found`);
    }
    
    // Get current thread messages for potential revert
    const currentThreadMessages = relationships.threadMessages[id] || [];
    
    // Apply optimistic update
    set((state) => ({
      entities: {
        ...state.entities,
        threads: removeEntity(state.entities.threads, id)
      },
      relationships: {
        ...state.relationships,
        threadMessages: removeAllRelationships(state.relationships.threadMessages, id)
      }
    }), false, 'threads/deleteThread/optimistic');
    
    try {
      await httpDataService.deleteThread(id);
      
      // Success - optimistic update was correct
      
      // If this was the active thread, clear that selection
      if (get().ui.activeThreadId === id) {
        set((state) => ({
          ui: {
            ...state.ui,
            activeThreadId: null,
          }
        }), false, 'threads/deleteThread/clearActiveThread');
      }
      
    } catch (error) {
      console.error(`Error deleting thread ${id}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        entities: {
          ...state.entities,
          threads: {
            ...state.entities.threads,
            [id]: currentThread
          }
        },
        relationships: {
          ...state.relationships,
          threadMessages: {
            ...state.relationships.threadMessages,
            [id]: currentThreadMessages
          }
        }
      }), false, 'threads/deleteThread/revert');
      
      throw error;
    }
  },
  
  switchThread: async (id: string | null) => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.SWITCH_THREAD]: true
        },
        activeThreadId: id  // Optimistically update active thread
      }
    }), false, 'threads/switchThread/start');
    
    try {
      // If switching to a thread (not just clearing)
      if (id) {
        // Ensure thread exists or fetch it
        const thread = await get().getThread(id);
        if (!thread) {
          throw new Error(`Thread with id ${id} not found`);
        }
        
        // Here we could also load related data like messages
        // This would be implemented in the messages slice
      }
      
      // Complete the switch
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.SWITCH_THREAD]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.SWITCH_THREAD]: null
          }
        }
      }), false, 'threads/switchThread/success');
    } catch (error) {
      console.error('Error switching thread:', error);
      
      // Revert thread switch if there was an error
      set((state) => ({
        ui: {
          ...state.ui,
          activeThreadId: null, // Clear selection on error
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.SWITCH_THREAD]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.SWITCH_THREAD]: error as Error
          }
        }
      }), false, 'threads/switchThread/error');
      
      throw error;
    }
  },

  // Thread-Synth relationship actions
  getThreadSynths: async (threadId: string) => {
    try {
      // Use the directService to fetch thread synths
      const threadSynths = await directService.getThreadSynths(threadId);
      
      // Create a list of synth IDs for this thread - extract from synth_reference.synthId
      const synthIds = threadSynths.map((ts: any) => {
        return ts.synth_reference?.synthId;
      }).filter(Boolean) as string[];
      
      // Update the relationship in the store
      set((state) => ({
        relationships: {
          ...state.relationships,
          threadSynths: {
            ...state.relationships.threadSynths,
            [threadId]: synthIds
          }
        }
      }), false, 'threads/getThreadSynths/success');
      
      // Store the actual synth entities in the store
      for (const threadSynth of threadSynths) {
        if (threadSynth.synth && threadSynth.synth_reference?.synthId) {
          const synthId = threadSynth.synth_reference.synthId;
          
          // Convert the synth data to COAISynth format for the store
          const synthEntity = {
            id: synthId,
            user_id: get().user?.id || '',
            synth_data: {
              name: threadSynth.synth.name,
              role: threadSynth.synth.role,
              age: threadSynth.synth.age,
              profileImage: threadSynth.synth.profileImage,
              bio: threadSynth.synth.bio,
              experience: threadSynth.synth.experience,
              systemPrompt: threadSynth.synth.systemPrompt,
              baseModel: threadSynth.synth.baseModel,
              chatColor: threadSynth.synth.chatColor,
              metadata: {}
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Add to entities store
          set((state) => ({
            entities: {
              ...state.entities,
              synths: {
                ...state.entities.synths,
                [synthId]: synthEntity
              }
            }
          }), false, 'threads/getThreadSynths/addSynthEntity');
        }
      }
      
      return threadSynths;
    } catch (error) {
      console.error(`Error fetching synths for thread ${threadId}:`, error);
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getThreadSynths: error as Error
          }
        }
      }), false, 'threads/getThreadSynths/error');
      return [];
    }
  },
  
  addSynthToThread: async (threadId: string, synthId: string, reference: COAITeamSynthReference) => {
    try {
      // Add optimistic update for relationship
      set((state) => ({
        relationships: {
          ...state.relationships,
          threadSynths: addRelationship(state.relationships.threadSynths, threadId, synthId)
        }
      }), false, 'threads/addSynthToThread/optimistic');
      
      // Create thread-synth relationship in database
      await directService.addSynthToThread(threadId, synthId, reference);
      
      // Success - optimistic update was correct
    } catch (error) {
      console.error(`Error adding synth ${synthId} to thread ${threadId}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        relationships: {
          ...state.relationships,
          threadSynths: removeRelationship(state.relationships.threadSynths, threadId, synthId)
        }
      }), false, 'threads/addSynthToThread/revert');
      
      throw error;
    }
  },
  
  removeSynthFromThread: async (threadId: string, synthId: string) => {
    try {
      // Apply optimistic update for relationship
      set((state) => ({
        relationships: {
          ...state.relationships,
          threadSynths: removeRelationship(state.relationships.threadSynths, threadId, synthId)
        }
      }), false, 'threads/removeSynthFromThread/optimistic');
      
      // Remove thread-synth relationship from database
      await directService.removeSynthFromThread(threadId, synthId);
      
      // Success - optimistic update was correct
    } catch (error) {
      console.error(`Error removing synth ${synthId} from thread ${threadId}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        relationships: {
          ...state.relationships,
          threadSynths: addRelationship(state.relationships.threadSynths, threadId, synthId)
        }
      }), false, 'threads/removeSynthFromThread/revert');
      
      throw error;
    }
  },

  updateThreadSynthReference: async (threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>) => {
    try {
      // Update thread-synth reference in database
      await directService.updateThreadSynthReference(threadId, synthId, reference);
      
      // Success - no need for optimistic updates since this is just metadata
    } catch (error) {
      console.error(`Error updating reference for synth ${synthId} in thread ${threadId}:`, error);
      throw error;
    }
  }
}); 