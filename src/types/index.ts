// Define the base types used throughout the application

// AI Employee type definition
export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  age: number;
  gender?: 'male' | 'female' | 'non-binary' | 'any';
  profileImage: string;
  bio?: string;
  experience?: string[];
  systemPrompt: string;
  baseModel: 'gpt-4.1-nano' | 'o4-mini' | 'o3' | 'o1' | 'gpt-4.1' | 'gpt-4o' | 'chatgpt-4o-latest';
  isLoadingImage?: boolean; // Flag to indicate if profile image is still being generated
  isPublic?: boolean; // Flag to indicate if this synth is publicly visible
}

// Pagination options for fetching data
export interface PaginationOptions {
  limit?: number;
  before?: Date;
  after?: Date;
  cursor?: string;
}

// Chat message type definition
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  aiEmployee?: {
    id: string;
    name: string;
    role: string;
    profileImage: string;
    model: string;
  };
  isLoading?: boolean;
  // Image support
  image?: {
    url: string;
    base64?: string;
    name: string;
    size: number;
    type: string;
    _wasStripped?: boolean; // Flag to indicate image data was removed for storage
  };
}

// Team member type (simplified version of AIEmployee)
export type TeamMember = Pick<AIEmployee, 'id' | 'name' | 'role' | 'profileImage'> & {
  model: string;
  systemPrompt: string;
};

// Team type definition
export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  messages: ChatMessage[];
  createdAt: Date;
  isActive: boolean;
}

// Serializable team type for localStorage (Date as string)
export interface SerializableTeam extends Omit<Team, 'createdAt' | 'messages'> {
  createdAt: string;
  messages: SerializableChatMessage[];
}

// Serializable message type for localStorage (Date as string)  
export interface SerializableChatMessage extends Omit<ChatMessage, 'timestamp'> {
  timestamp: string;
}

// =============================================================================
// COAI Database Types - For Supabase integration
// =============================================================================

// Profile data structure for coai-profiles table
export interface COAIProfileData {
  displayName?: string;
  avatar?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: boolean;
    defaultModel?: string;
  };
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    googleai?: string;
    [provider: string]: string | undefined;
  };
  metadata?: Record<string, any>;
}

// Synth data structure for coai-synths table (aligns with AIEmployee)
export interface COAISynthData {
  name: string;
  role: string;
  age: number;
  gender?: 'male' | 'female' | 'non-binary' | 'any';
  profileImage: string;
  bio?: string;
  experience?: string[];
  systemPrompt: string;
  baseModel: 'gpt-4.1-nano' | 'o4-mini' | 'o3' | 'o1' | 'gpt-4.1' | 'gpt-4o' | 'chatgpt-4o-latest';
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

// Team data structure for coai-teams table
export interface COAITeamData {
  name: string;
  description?: string;
  teamImage?: string;
  teamType: 'custom' | 'premade';
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

// Team-synth reference data for coai-team-synths table
export interface COAITeamSynthReference {
  synthId: string; // Can be UUID for custom synths or external ID for premade
  isCustom: boolean;
  metadata?: {
    model?: string;
    systemPrompt?: string;
    originalMemberId?: string;
    name?: string;
    role?: string;
    profileImage?: string;
    [key: string]: any; // Allow additional metadata
  };
}

// Thread data structure for coai-threads table
export interface COAIThreadData {
  title?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

// Message data structure for coai-messages table (aligns with ChatMessage)
export interface COAIMessageData {
  content: string;
  sender: 'user' | 'ai';
  aiEmployee?: {
    id: string;
    name: string;
    role: string;
    profileImage: string;
    model: string;
  };
  image?: {
    url: string;
    base64?: string;
    name: string;
    size: number;
    type: string;
    _wasStripped?: boolean;
  };
  isLoading?: boolean;
  metadata?: Record<string, any>;
}

// Database row types (what we get from Supabase)
export interface COAIProfile {
  id: string;
  user_id: string;
  profile_data: COAIProfileData;
  created_at: string;
  updated_at: string;
}

export interface COAISynth {
  id: string;
  user_id: string;
  synth_data: COAISynthData;
  created_at: string;
  updated_at: string;
}

export interface COAITeam {
  id: string;
  user_id: string;
  team_data: COAITeamData;
  created_at: string;
  updated_at: string;
}

export interface COAITeamSynth {
  id: string;
  team_id: string;
  synth_id: string | null;
  synth_reference: COAITeamSynthReference;
  created_at: string;
}

export interface COAIThread {
  id: string;
  user_id: string;
  team_id: string | null;
  thread_data: COAIThreadData;
  created_at: string;
  updated_at: string;
}

export interface COAIMessage {
  id: string;
  thread_id: string;
  message_data: COAIMessageData;
  created_at: string;
}

// Document data structure for coai-documents table
export interface COAIDocumentData {
  title: string;
  content: string;
  type?: 'text' | 'markdown' | 'code' | 'note';
  tags?: string[];
  metadata?: Record<string, any>;
}

// Database row type for documents
export interface COAIDocument {
  id: string;
  user_id: string;
  document_data: COAIDocumentData;
  created_at: string;
  updated_at: string;
}

export interface CustomTeam {
  id: string;
  name: string;
  selectedSynths: AIEmployee[];
  createdAt: Date;
  description?: string;
  teamImage?: string;
  isPublic?: boolean; // Flag to indicate if this team is publicly visible
}

export interface Thread {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}