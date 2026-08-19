import { StateCreator } from 'zustand';
import { RootState } from '../../types/store';
import { COAISynth, COAISynthData } from '../../types';
import { normalizeArray, removeEntity } from '../../lib/utils/normalization';
import { DataService, httpDataService } from '../../lib/services/dataService';
import { LoadingStateKey } from '../../types/store';

export interface SynthsState {
  // Actions
  fetchSynths: () => Promise<void>;
  getSynth: (id: string) => Promise<COAISynth | null>;
  createSynth: (synthData: COAISynthData) => Promise<COAISynth>;
  updateSynth: (id: string, updates: Partial<COAISynthData>) => Promise<COAISynth>;
  deleteSynth: (id: string) => Promise<void>;
  selectSynth: (id: string | null) => void;
}

export const createSynthsSlice: StateCreator<
  RootState,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  SynthsState
> = (set, get) => ({
  // Actions
  fetchSynths: async () => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.FETCH_SYNTHS]: true
        }
      }
    }), false, 'synths/fetchSynths/start');
    
    try {
      const synths = await DataService.fetchPublicSynths();
      
      console.log('🔍 [SYNTHS STORE DEBUG] Fetched synths:', synths.length, synths);
      
      // Normalize synths by ID
      const normalizedSynths = normalizeArray(synths as COAISynth[]);
      
      // Update state with normalized synths
      set((state) => ({
        entities: {
          ...state.entities,
          synths: normalizedSynths
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_SYNTHS]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_SYNTHS]: null
          }
        }
      }), false, 'synths/fetchSynths/success');
    } catch (error) {
      console.error('Error fetching synths:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_SYNTHS]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_SYNTHS]: error as Error
          }
        }
      }), false, 'synths/fetchSynths/error');
    }
  },
  
  getSynth: async (id: string) => {
    const { entities } = get();
    
    // Return from cache if available
    if (entities.synths[id]) return entities.synths[id];
    
    try {
      const synth = await httpDataService.getSynth(id);
      if (!synth) return null;
      
      // Update store with fetched synth
      set((state) => ({
        entities: {
          ...state.entities,
          synths: {
            ...state.entities.synths,
            [id]: synth
          }
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getSynth: null
          }
        }
      }), false, 'synths/getSynth/success');
      
      return synth;
    } catch (error) {
      console.error(`Error fetching synth ${id}:`, error);
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getSynth: error as Error
          }
        }
      }), false, 'synths/getSynth/error');
      return null;
    }
  },
  
  createSynth: async (synthData: COAISynthData) => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.CREATE_SYNTH]: true
        }
      }
    }), false, 'synths/createSynth/start');
    
    try {
      // Prepare synth data with proper user_id if authenticated
      const newSynth = await httpDataService.createSynth({
          ...synthData,
          isPublic: synthData.isPublic !== undefined ? synthData.isPublic : true
        });
      
      // Update store with new synth
      set((state) => ({
        entities: {
          ...state.entities,
          synths: {
            ...state.entities.synths,
            [newSynth.id]: newSynth
          }
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_SYNTH]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_SYNTH]: null
          }
        }
      }), false, 'synths/createSynth/success');
      
      return newSynth;
    } catch (error) {
      console.error('Error creating synth:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_SYNTH]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_SYNTH]: error as Error
          }
        }
      }), false, 'synths/createSynth/error');
      throw error;
    }
  },
  
  updateSynth: async (id: string, updates: Partial<COAISynthData>) => {
    const { entities } = get();
    
    // Get current synth
    const currentSynth = entities.synths[id];
    if (!currentSynth) {
      throw new Error(`Synth with id ${id} not found`);
    }
    
    // Apply optimistic update
    const updatedSynthData = {
      ...currentSynth.synth_data,
      ...updates,
      // Ensure isPublic is preserved if not explicitly changed
      isPublic: updates.isPublic !== undefined ? updates.isPublic : currentSynth.synth_data.isPublic
    };
    
    const updatedSynth = { 
      ...currentSynth,
      synth_data: updatedSynthData,
      updated_at: new Date().toISOString() 
    };
    
    set((state) => ({
      entities: {
        ...state.entities,
        synths: {
          ...state.entities.synths,
          [id]: updatedSynth
        }
      }
    }), false, 'synths/updateSynth/optimistic');
    
    try {
      // Prepare update data
      const serverUpdatedSynth = await httpDataService.updateSynth(id, updatedSynthData);
      
      // Update store with server response
      set((state) => ({
        entities: {
          ...state.entities,
          synths: {
            ...state.entities.synths,
            [id]: serverUpdatedSynth
          }
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            updateSynth: null
          }
        }
      }), false, 'synths/updateSynth/success');
      
      return serverUpdatedSynth;
    } catch (error) {
      // Revert to original state on error
      set((state) => ({
        entities: {
          ...state.entities,
          synths: {
            ...state.entities.synths,
            [id]: currentSynth
          }
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            updateSynth: error as Error
          }
        }
      }), false, 'synths/updateSynth/error');
      
      console.error(`Error updating synth ${id}:`, error);
      throw error;
    }
  },
  
  deleteSynth: async (id: string) => {
    const { entities } = get();
    
    // Store current state for potential rollback
    const currentSynths = { ...entities.synths };
    
    // Apply optimistic delete
    set((state) => ({
      entities: {
        ...state.entities,
        synths: removeEntity(state.entities.synths, id)
      }
    }), false, 'synths/deleteSynth/optimistic');
    
    try {
      await httpDataService.deleteSynth(id);
      
      // Update UI state on success
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            deleteSynth: null
          }
        }
      }), false, 'synths/deleteSynth/success');
    } catch (error) {
      // Rollback on error
      set((state) => ({
        entities: {
          ...state.entities,
          synths: currentSynths
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            deleteSynth: error as Error
          }
        }
      }), false, 'synths/deleteSynth/error');
      
      console.error(`Error deleting synth ${id}:`, error);
      throw error;
    }
  },
  
  selectSynth: (id: string | null) => {
    set((state) => ({
      ui: {
        ...state.ui,
        selectedSynthId: id
      }
    }), false, 'synths/selectSynth');
  }
}); 