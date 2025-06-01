import { Session } from '@supabase/supabase-js';
import { 
  COAIProfile, 
  COAISynth, 
  COAITeam, 
  Thread, 
  COAIMessage,
  AIEmployee,
  ChatMessage
} from './index';

// Normalized entities
export interface NormalizedEntities {
  profiles: Record<string, COAIProfile>;
  synths: Record<string, COAISynth>;
  teams: Record<string, COAITeam>;
  threads: Record<string, Thread>;
  messages: Record<string, COAIMessage>;
  aiEmployees: Record<string, AIEmployee>;
}

// Relationships between entities
export interface EntityRelationships {
  teamSynths: Record<string, string[]>;
  threadMessages: Record<string, string[]>;
  userTeams: Record<string, string[]>;
}

// UI state
export interface UIState {
  activeTeamId: string | null;
  activeThreadId: string | null;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;
}

// Auth state
export interface AuthState {
  session: Session | null;
  isAuthenticated: boolean;
  tempApiKeys: {
    openai?: string;
    anthropic?: string;
    googleai?: string;
    // Other provider keys as needed
  };
}

// Root state
export interface RootState {
  entities: NormalizedEntities;
  relationships: EntityRelationships;
  ui: UIState;
  auth: AuthState;
}

// Loading state keys
export enum LoadingStateKey {
  FETCH_TEAMS = 'fetchTeams',
  FETCH_SYNTHS = 'fetchSynths',
  FETCH_THREADS = 'fetchThreads',
  FETCH_MESSAGES = 'fetchMessages',
  CREATE_TEAM = 'createTeam',
  CREATE_SYNTH = 'createSynth',
  CREATE_THREAD = 'createThread',
  SEND_MESSAGE = 'sendMessage',
  SWITCH_THREAD = 'switchThread',
  AUTH_SIGNIN = 'authSignIn',
  AUTH_SIGNOUT = 'authSignOut',
} 