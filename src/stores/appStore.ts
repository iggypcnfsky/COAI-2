import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { RootState, ProfileSectionState } from '../types/store';
import { AIEmployee } from '../types';
import { createAuthSlice } from './slices/authSlice';
import { createSynthsSlice } from './slices/synthsSlice';
import { createTeamsSlice } from './slices/teamsSlice';
import { createThreadsSlice } from './slices/threadsSlice';
import { createMessagesSlice } from './slices/messagesSlice';
import { createDocumentsSlice } from './slices/documentsSlice';

// Debug flag to enable/disable diagnostic logging
const DEBUG = false;

// Initial message input state
const initialMessageInputState = {
  text: '',
  cursorPosition: 0,
  isTriggeringAI: false,
  attachedImage: null,
  isDragOver: false,
  messageHistory: [],
  historyIndex: -1,
  selectedMentionIndex: 0
};

// Initial profile section state
const initialProfileSectionState: ProfileSectionState = {
  systemPrompt: '',
  selectedModel: 'gpt-4o',
  isUpdateSuccessful: false,
  deleteDialogOpen: false
};

// Initial state
const initialState = {
  entities: {
    profiles: {},
    synths: {},
    teams: {},
    threads: {},
    messages: {},
    aiEmployees: {},
    documents: {}
  },
  relationships: {
    teamSynths: {},
    threadSynths: {},
    threadMessages: {},
    userTeams: {}
  },
  ui: {
    activeTeamId: null,
    activeThreadId: null,
    selectedSynthId: null,
    activeDocumentId: null,
    activeDocumentId_doc: null,
    loadingStates: {
      fetchSynths: false,
      fetchTeams: false,
      fetchThreads: false,
      fetchMessages: false,
      sendMessage: false,
      switchThread: false
    },
    loadingStates_doc: {
      fetchDocuments: false,
      saveDocument: false
    },
    errors: {},
    messageInput: initialMessageInputState,
    profileSection: initialProfileSectionState
  },
  tempApiKeys: (() => {
    try {
      const savedApiKeys = localStorage.getItem('tempApiKeys');
      if (savedApiKeys) {
        return JSON.parse(savedApiKeys);
      }
    } catch (error) {
      console.error('Error loading tempApiKeys from localStorage:', error);
    }
    return {};
  })(),
};

// Debug logging of initial state
// if (DEBUG) {
//   console.log('DEBUG - Initial state:', initialState);
//   console.log('DEBUG - Initial messageInput:', initialState.ui.messageInput);
// }

// Create the store with middleware
export const useAppStore = create<RootState>()(
  devtools(
    persist(
      (set, get, store) => {
        // Debug log the initial store setup
        // if (DEBUG) {
        //   console.log('DEBUG - Creating store with initial state');
        // }
        
        // Create store with safer initialization
        const storeState = {
          ...initialState,
          // Add UI methods for profileSection
          setProfileSystemPrompt: (systemPrompt: string) => set((state) => ({
            ui: {
              ...state.ui,
              profileSection: {
                ...state.ui.profileSection,
                systemPrompt
              }
            }
          })),
          setProfileSelectedModel: (selectedModel: AIEmployee['baseModel']) => set((state) => ({
            ui: {
              ...state.ui,
              profileSection: {
                ...state.ui.profileSection,
                selectedModel
              }
            }
          })),
          setProfileUpdateSuccessful: (isUpdateSuccessful: boolean) => set((state) => ({
            ui: {
              ...state.ui,
              profileSection: {
                ...state.ui.profileSection,
                isUpdateSuccessful
              }
            }
          })),
          setProfileDeleteDialogOpen: (deleteDialogOpen: boolean) => set((state) => ({
            ui: {
              ...state.ui,
              profileSection: {
                ...state.ui.profileSection,
                deleteDialogOpen
              }
            }
          })),
          // Add missing setActiveDocument method
          setActiveDocument: (id: string | null) => set((state) => ({
            ui: {
              ...state.ui,
              activeDocumentId: id
            }
          })),
          // Include auth slice
          ...createAuthSlice(set, get, store),
          // Include synths slice
          ...createSynthsSlice(set, get, store),
          // Include teams slice
          ...createTeamsSlice(set, get, store),
          // Include threads slice
          ...createThreadsSlice(set, get, store),
          // Include messages slice
          ...createMessagesSlice(set, get, store),
          // Include documents slice
          ...createDocumentsSlice(set, get, store),
        };
        
        // Debug log the created store
        // if (DEBUG) {
        //   console.log('DEBUG - Store created:', storeState);
        //   console.log('DEBUG - Store ui:', storeState.ui);
        //   console.log('DEBUG - Store messageInput:', storeState.ui?.messageInput);
        //   console.log('DEBUG - Store profileSection:', storeState.ui?.profileSection);
        // }
        
        return storeState;
      },
      {
        name: 'coai-store',
        // Only persist authenticated data
        partialize: (state) => {
          if (!state.isAuthenticated) {
            return {};
          }
          return state;
        },
        // Fix potential hydration issues
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          
          const appStore = useAppStore.getState();
          
          // Ensure messageInput is properly initialized after rehydration
          if (!state.ui.messageInput) {
            appStore.ui = {
              ...appStore.ui,
              messageInput: initialMessageInputState
            };
          }
          
          // Ensure profileSection is properly initialized after rehydration
          if (!state.ui.profileSection) {
            appStore.ui = {
              ...appStore.ui,
              profileSection: initialProfileSectionState
            };
          }
        }
      }
    )
  )
);

// Reset store to initial state
export const resetStore = () => {
  const store = useAppStore.getState();
  const tempApiKeys = store.tempApiKeys;
  const documents = store.entities?.documents || {};
  
  // Debug log before reset
  // if (DEBUG) {
  //   console.log('DEBUG - Before reset, store state:', store);
  //   console.log('DEBUG - Before reset, messageInput:', store.ui?.messageInput);
  //   console.log('DEBUG - Before reset, profileSection:', store.ui?.profileSection);
  // }
  
  // Create a safe baseline state to work with
  const safeInitialState = {
    ...initialState,
    ui: {
      ...initialState.ui,
      messageInput: initialMessageInputState,
      profileSection: initialProfileSectionState
    },
    entities: {
      ...initialState.entities,
      documents
    },
    tempApiKeys
  };
  

  
  // Reset the store with proper initialization
  // Note: We can't easily recreate the slices in reset, so we'll just reset the data
  useAppStore.setState(safeInitialState as any);
  
  // Debug log after reset
  // if (DEBUG) {
  //   const newState = useAppStore.getState();
  //   console.log('DEBUG - After reset, store state:', newState);
  //   console.log('DEBUG - After reset, messageInput:', newState.ui?.messageInput);
  //   console.log('DEBUG - After reset, profileSection:', newState.ui?.profileSection);
  // }
};

// Utility to access current store state
export const getState = () => {
  const state = useAppStore.getState();
  if (DEBUG) {
    console.log('DEBUG - getState called, current state:', state);
    console.log('DEBUG - Current messageInput:', state.ui?.messageInput);
  }
  return state;
};

 