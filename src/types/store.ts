import { Session, User } from '@supabase/supabase-js';
import { 
  COAIProfile, 
  COAISynth, 
  COAITeam, 
  Thread, 
  COAIMessage,
  COAIDocument,
  COAIDocumentData,
  AIEmployee,
  COAISynthData,
  COAITeamData,
  COAITeamSynth,
  COAITeamSynthReference,
  COAIMessageData
} from './index';

// Legacy Document type for backward compatibility
export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// MessageInput state
export interface MessageInputState {
  text: string;
  cursorPosition: number;
  isTriggeringAI: boolean;
  attachedImage: any | null;
  isDragOver: boolean;
  messageHistory: string[];
  historyIndex: number;
  selectedMentionIndex: number;
}

// ProfileSection state
export interface ProfileSectionState {
  systemPrompt: string;
  selectedModel: AIEmployee['baseModel'];
  isUpdateSuccessful: boolean;
  deleteDialogOpen: boolean;
}

// Normalized entities
export interface NormalizedEntities {
  profiles: Record<string, COAIProfile>;
  synths: Record<string, COAISynth>;
  teams: Record<string, COAITeam>;
  threads: Record<string, Thread>;
  messages: Record<string, COAIMessage & { _isOptimistic?: boolean }>;
  aiEmployees: Record<string, AIEmployee>;
  documents: Record<string, COAIDocument>;
}

// Relationships between entities
export interface EntityRelationships {
  teamSynths: Record<string, string[]>;
  threadSynths: Record<string, string[]>;
  threadMessages: Record<string, string[]>;
  userTeams: Record<string, string[]>;
}

// UI state
export interface UIState {
  activeTeamId: string | null;
  activeThreadId: string | null;
  selectedSynthId: string | null;
  activeDocumentId: string | null;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
  messageInput: MessageInputState;
  profileSection: ProfileSectionState;

  // Added for documentsSlice
  activeDocumentId_doc: string | null;
  loadingStates_doc: {
    fetchDocuments: boolean;
    saveDocument: boolean;
  };
}

// Root state combines all slices and the shared state
export interface RootState {
  entities: NormalizedEntities;
  relationships: EntityRelationships;
  ui: UIState;
  
  // Auth slice state will be injected here
  session: Session | null;
  user: User | null;
  profile: COAIProfile | null;
  isAuthenticated: boolean;
  tempApiKeys: {
    openai?: string;
    anthropic?: string;
    perplexity?: string;
    googleai?: string;
    [key: string]: string | undefined;
  };
  
  // Auth slice methods will be injected here
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: COAIProfile | null) => void;
  setTempApiKey: (provider: string, key: string) => void;
  removeTempApiKey: (provider: string) => void;
  clearTempApiKeys: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signInWithGoogle: () => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<{ error: any | null }>;
  updateProfile: (profileData: any) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  refreshProfileFromUser: () => Promise<void>;
  _loadProfile: (userId: string) => Promise<void>;
  _createProfile: (userId: string) => Promise<void>;
  
  // Synths slice methods will be injected here
  fetchSynths: () => Promise<void>;
  getSynth: (id: string) => Promise<COAISynth | null>;
  createSynth: (synthData: COAISynthData) => Promise<COAISynth>;
  updateSynth: (id: string, updates: Partial<COAISynthData>) => Promise<COAISynth>;
  deleteSynth: (id: string) => Promise<void>;
  selectSynth: (id: string | null) => void;

  // Teams slice methods will be injected here
  fetchTeams: () => Promise<void>;
  getTeam: (id: string) => Promise<COAITeam | null>;
  createTeam: (teamData: COAITeamData) => Promise<COAITeam>;
  updateTeam: (id: string, updates: Partial<COAITeamData>) => Promise<COAITeam>;
  deleteTeam: (id: string) => Promise<void>;
  selectTeam: (id: string | null) => void;
  addSynthToTeam: (teamId: string, synthId: string, reference: COAITeamSynthReference) => Promise<void>;
  removeSynthFromTeam: (teamId: string, synthId: string) => Promise<void>;
  getTeamSynths: (teamId: string) => Promise<COAITeamSynth[]>;
  updateTeamSynthReference: (teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>) => Promise<void>;

  // Threads slice methods will be injected here
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
  
  // Messages slice methods will be injected here
  fetchMessages: (threadId: string, options?: { limit?: number; before?: Date }) => Promise<COAIMessage[]>;
  getMessage: (id: string) => Promise<COAIMessage | null>;
  sendMessage: (threadId: string, messageData: COAIMessageData) => Promise<COAIMessage>;
  updateMessage: (id: string, updates: Partial<COAIMessageData>) => Promise<COAIMessage>;
  deleteMessage: (id: string) => Promise<void>;
  startMessageStream: (threadId: string, initialContent: string, aiEmployee?: COAIMessageData['aiEmployee']) => Promise<string>;
  appendToMessageStream: (messageId: string, content: string) => void;
  completeMessageStream: (messageId: string) => Promise<void>;
  cancelMessageStream: (messageId: string) => void;

  // Message input methods
  setMessageInputText: (text: string) => void;
  setMessageInputCursorPosition: (cursorPosition: number) => void;
  setMessageInputIsTriggeringAI: (isTriggeringAI: boolean) => void;
  setMessageInputAttachedImage: (attachedImage: any | null) => void;
  setMessageInputIsDragOver: (isDragOver: boolean) => void;
  setMessageInputHistory: (messageHistory: string[]) => void;
  setMessageInputHistoryIndex: (historyIndex: number) => void;
  setMessageInputSelectedMentionIndex: (selectedMentionIndex: number) => void;
  resetMessageInput: () => void;

  // Profile section methods
  setProfileSystemPrompt: (systemPrompt: string) => void;
  setProfileSelectedModel: (selectedModel: AIEmployee['baseModel']) => void;
  setProfileUpdateSuccessful: (isUpdateSuccessful: boolean) => void;
  setProfileDeleteDialogOpen: (deleteDialogOpen: boolean) => void;

  // Documents slice methods will be injected here
  fetchDocuments: () => Promise<{ error: Error | null }>;
  createDocument: (documentData: COAIDocumentData) => Promise<{ data: COAIDocument | null; error: Error | null }>;
  updateDocumentById: (documentId: string, updates: Partial<COAIDocumentData>) => Promise<{ error: Error | null }>;
  deleteDocument: (documentId: string) => Promise<{ error: Error | null }>;
  
  // API Key persistence methods
  saveApiKey: (provider: string, key: string) => Promise<{ error: Error | null }>;
  removeApiKey: (provider: string) => Promise<{ error: Error | null }>;
  getApiKey: (provider: string) => string | undefined;
}

// Loading state keys
export enum LoadingStateKey {
  FETCH_TEAMS = 'fetchTeams',
  FETCH_SYNTHS = 'fetchSynths',
  FETCH_THREADS = 'fetchThreads',
  FETCH_MESSAGES = 'fetchMessages',
  FETCH_DOCUMENTS = 'fetchDocuments',
  CREATE_TEAM = 'createTeam',
  CREATE_SYNTH = 'createSynth',
  CREATE_THREAD = 'createThread',
  CREATE_DOCUMENT = 'createDocument',
  SEND_MESSAGE = 'sendMessage',
  SAVE_DOCUMENT = 'saveDocument',
  SWITCH_THREAD = 'switchThread',
  AUTH_SIGNIN = 'authSignIn',
  AUTH_SIGNOUT = 'authSignOut',
} 