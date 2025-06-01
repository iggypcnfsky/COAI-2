import { Team, ChatMessage } from '@/types'

// Storage adapter interface
export interface COAIStorageAdapter {
  // Adapter identification
  readonly type: 'supabase'
  readonly isAuthenticated: boolean
  
  // Threads (individual chats/conversations)
  getThreads(): Promise<Team[]> // Returns threads formatted as legacy Team objects
  createThread(title: string): Promise<string>
  updateThread(threadId: string, updates: { title?: string; isActive?: boolean }): Promise<void>
  deleteThread(threadId: string): Promise<void>
  
  // Teams (collections of synths)
  createTeam(team: Team): Promise<Team>
  updateTeam(teamId: string, updates: Partial<Team>): Promise<Team>
  deleteTeam(teamId: string): Promise<void>
  
  // Messages
  getMessages(threadId?: string): Promise<ChatMessage[]>
  createMessage(message: ChatMessage, threadId: string): Promise<ChatMessage>
  updateMessage(messageId: string, updates: Partial<ChatMessage>): Promise<ChatMessage>
  deleteMessage(messageId: string): Promise<void>
  
  // State management
  getActiveTeamId(): Promise<string | null>  // Legacy method name for backward compatibility
  setActiveTeamId(teamId: string | null): Promise<void>  // Legacy method name for backward compatibility
  getActiveThreadId(): Promise<string | null>
  setActiveThreadId(threadId: string | null): Promise<void>
  
  // Data management
  clearData(): Promise<void>
  
  // Health checks
  isHealthy(): Promise<boolean>
  getStorageInfo(): Promise<StorageInfo>
}

// Storage information
export interface StorageInfo {
  type: 'supabase'
  used: number // bytes
  available: number // bytes
  healthy: boolean
  warnings: string[]
}

// Local storage detection
export interface LocalDataCheck {
  hasData: boolean
  teams: number
  messages: number
  estimatedSize: number
} 