/**
 * Direct Service Implementation
 * 
 * This service handles business logic and API orchestration.
 * For authenticated users, it delegates data operations to SupabaseDataService.
 * For unauthenticated users, it uses in-memory storage and direct API calls.
 */

import { v4 as uuidv4 } from 'uuid';
import { SupabaseDataService, IDataService } from './dataService';
import { getState } from '../../stores';
import { 
  COAISynth, 
  COAITeam, 
  COAIMessage, 
  Thread,
  COAISynthData,
  COAITeamData,
  COAIMessageData,
  COAITeamSynthReference,
  PaginationOptions,
  ChatMessage,

} from '../../types';

// In-memory storage for unauthenticated mode
const memoryStore = {
  synths: new Map<string, COAISynth>(),
  teams: new Map<string, COAITeam>(),
  threads: new Map<string, Thread>(),
  messages: new Map<string, COAIMessage>(),
  teamSynths: new Map<string, Map<string, COAITeamSynthReference>>(),
  threadMessages: new Map<string, string[]>(),
  activeThreadId: null as string | null
};

class DirectService implements IDataService {
  private dataService: SupabaseDataService | null = null;
  
  constructor() {
    // API base URL removed as it's not currently used
  }
  
  // Initialize with user for authenticated mode
  setUser(userId: string | null) {
    if (userId) {
      this.dataService = new SupabaseDataService(userId);
      } else {
      this.dataService = null;
    }
  }
  
  // Helper to get the API keys from the store
  private getApiKeys(): Record<string, string> {
    const apiKeys: Record<string, string> = {};
    
    try {
      const state = getState();
      if (state.tempApiKeys) {
        Object.entries(state.tempApiKeys).forEach(([provider, key]) => {
          if (key) {
            apiKeys[provider] = key;
          }
        });
      }
    } catch (storeError) {
      console.error('Error accessing store state:', storeError);
    }
    
    // Fallback to localStorage
    if (Object.keys(apiKeys).length === 0) {
      try {
        const savedApiKeys = localStorage.getItem('tempApiKeys');
        if (savedApiKeys) {
            const localStorageKeys = JSON.parse(savedApiKeys);
            Object.entries(localStorageKeys).forEach(([provider, key]) => {
              if (key) {
                apiKeys[provider] = key as string;
            }
          });
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
    
    return apiKeys;
  }
  
  private hasRequiredApiKeys(): boolean {
    const apiKeys = this.getApiKeys();
    return !!apiKeys.openai;
  }
  
  isAuthenticated(): boolean {
    return !!this.dataService;
  }
  

  
  // DELEGATE TO DATA SERVICE OR USE MEMORY STORE
  
  // SYNTHS
  async fetchSynths(): Promise<COAISynth[]> {
    if (this.dataService) {
      return this.dataService.fetchSynths();
    }
    return Array.from(memoryStore.synths.values());
  }
  
  async getSynth(id: string): Promise<COAISynth | null> {
    if (this.dataService) {
      return this.dataService.getSynth(id);
    }
    return memoryStore.synths.get(id) || null;
  }
  
  async createSynth(data: COAISynthData): Promise<COAISynth> {
    if (this.dataService) {
      return this.dataService.createSynth(data);
    }
    
    const synth: COAISynth = {
      id: uuidv4(),
      user_id: 'anonymous',
      synth_data: data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    memoryStore.synths.set(synth.id, synth);
    return synth;
  }
  
  async updateSynth(id: string, updates: Partial<COAISynthData>): Promise<COAISynth> {
    if (this.dataService) {
      return this.dataService.updateSynth(id, updates);
    }
    
    const existing = memoryStore.synths.get(id);
    if (!existing) {
      throw new Error('Synth not found');
    }
    
    const updated: COAISynth = {
      ...existing,
      synth_data: { ...existing.synth_data, ...updates },
      updated_at: new Date().toISOString()
    };
    
    memoryStore.synths.set(id, updated);
    return updated;
  }
  
  async deleteSynth(id: string): Promise<void> {
    if (this.dataService) {
      return this.dataService.deleteSynth(id);
    }
    
    memoryStore.synths.delete(id);
  }

  // TEAMS
  async fetchTeams(): Promise<COAITeam[]> {
    if (this.dataService) {
      return this.dataService.fetchTeams();
    }
    return Array.from(memoryStore.teams.values());
  }
  
  async getTeam(id: string): Promise<COAITeam | null> {
    if (this.dataService) {
      return this.dataService.getTeam(id);
    }
    return memoryStore.teams.get(id) || null;
  }
  
  async createTeam(data: COAITeamData): Promise<COAITeam> {
    if (this.dataService) {
      return this.dataService.createTeam(data);
    }
    
    const team: COAITeam = {
      id: uuidv4(),
      user_id: 'anonymous',
      team_data: data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    memoryStore.teams.set(team.id, team);
    return team;
  }
  
  async updateTeam(id: string, updates: Partial<COAITeamData>): Promise<COAITeam> {
    if (this.dataService) {
      return this.dataService.updateTeam(id, updates);
    }
    
    const existing = memoryStore.teams.get(id);
    if (!existing) {
      throw new Error('Team not found');
    }
    
    const updated: COAITeam = {
      ...existing,
      team_data: { ...existing.team_data, ...updates },
      updated_at: new Date().toISOString()
    };
    
    memoryStore.teams.set(id, updated);
    return updated;
  }
  
  async deleteTeam(id: string): Promise<void> {
    if (this.dataService) {
      return this.dataService.deleteTeam(id);
    }
    
    memoryStore.teams.delete(id);
    memoryStore.teamSynths.delete(id);
  }
  
  async addSynthToTeam(teamId: string, synthId: string, reference: COAITeamSynthReference): Promise<void> {
    if (this.dataService) {
      return this.dataService.addSynthToTeam(teamId, synthId, reference);
    }
    
    if (!memoryStore.teamSynths.has(teamId)) {
      memoryStore.teamSynths.set(teamId, new Map());
    }
    memoryStore.teamSynths.get(teamId)!.set(synthId, reference);
  }
  
  async removeSynthFromTeam(teamId: string, synthId: string): Promise<void> {
    if (this.dataService) {
      return this.dataService.removeSynthFromTeam(teamId, synthId);
    }
    
    const teamSynths = memoryStore.teamSynths.get(teamId);
    if (teamSynths) {
      teamSynths.delete(synthId);
    }
  }
  
  async getTeamSynths(teamId: string): Promise<{ synthId: string; reference: COAITeamSynthReference }[]> {
    if (this.dataService) {
      return this.dataService.getTeamSynths(teamId);
    }
    
    const teamSynths = memoryStore.teamSynths.get(teamId);
    if (!teamSynths) return [];
    
    return Array.from(teamSynths.entries()).map(([synthId, reference]) => ({
      synthId,
      reference
    }));
  }
  
  async updateTeamSynthReference(teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void> {
    if (this.dataService) {
      return this.dataService.updateTeamSynthReference(teamId, synthId, reference);
    }
    
    const teamSynths = memoryStore.teamSynths.get(teamId);
    if (teamSynths && teamSynths.has(synthId)) {
      const existing = teamSynths.get(synthId)!;
      teamSynths.set(synthId, { ...existing, ...reference });
    }
  }

  // THREADS
  async fetchThreads(teamId?: string): Promise<Thread[]> {
    if (this.dataService) {
      return this.dataService.fetchThreads();
    }
    
    const threads = Array.from(memoryStore.threads.values());
    if (teamId) {
      // For memory store, we'll store teamId in a separate map
      return threads.filter(thread => {
        // Check if this thread is associated with the team
        return memoryStore.teamSynths.has(thread.id);
      });
    }
    return threads;
  }
  
  async getThread(id: string): Promise<Thread | null> {
    if (this.dataService) {
      return this.dataService.getThread(id);
    }
    return memoryStore.threads.get(id) || null;
  }
  
  async createThread(title: string): Promise<Thread> {
    if (this.dataService) {
      return this.dataService.createThread(title);
    }
    
    const thread: Thread = {
      id: uuidv4(),
      title,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    memoryStore.threads.set(thread.id, thread);
    return thread;
  }

  async updateThread(id: string, updates: Partial<Thread>): Promise<Thread> {
    if (this.dataService) {
      return this.dataService.updateThread(id, updates);
    }
    
    const existing = memoryStore.threads.get(id);
    if (!existing) {
      throw new Error('Thread not found');
    }
    
    const updated: Thread = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    memoryStore.threads.set(id, updated);
    return updated;
  }
  
  async deleteThread(id: string): Promise<void> {
    if (this.dataService) {
      return this.dataService.deleteThread(id);
    }
    
    memoryStore.threads.delete(id);
    memoryStore.threadMessages.delete(id);
  }

  // MESSAGES
  async fetchMessages(threadId: string, options?: PaginationOptions): Promise<COAIMessage[]> {
    if (this.dataService) {
      return this.dataService.fetchMessages(threadId, options);
    }
    
    const messageIds = memoryStore.threadMessages.get(threadId) || [];
    const messages = messageIds
      .map(id => memoryStore.messages.get(id))
      .filter(Boolean) as COAIMessage[];
    
    if (options?.limit) {
      return messages.slice(0, options.limit);
    }
    
    return messages;
  }
  
  async getMessage(id: string): Promise<COAIMessage | null> {
    if (this.dataService) {
      return this.dataService.getMessage(id);
    }
    return memoryStore.messages.get(id) || null;
  }
  
  async createMessage(threadId: string, messageData: COAIMessageData): Promise<COAIMessage> {
    if (this.dataService) {
      return this.dataService.createMessage(threadId, messageData);
    }
    
    const message: COAIMessage = {
      id: uuidv4(),
      thread_id: threadId,
      message_data: messageData,
      created_at: new Date().toISOString()
    };
    
    memoryStore.messages.set(message.id, message);
    
    if (!memoryStore.threadMessages.has(threadId)) {
      memoryStore.threadMessages.set(threadId, []);
    }
    memoryStore.threadMessages.get(threadId)!.push(message.id);
    
    return message;
  }

  async updateMessage(id: string, updates: Partial<COAIMessageData>): Promise<COAIMessage> {
    if (this.dataService) {
      return this.dataService.updateMessage(id, updates);
    }
    
    const existing = memoryStore.messages.get(id);
    if (!existing) {
      throw new Error('Message not found');
    }
    
    const updated: COAIMessage = {
      ...existing,
      message_data: { ...existing.message_data, ...updates }
    };
    
    memoryStore.messages.set(id, updated);
    return updated;
  }
  
  async deleteMessage(id: string): Promise<void> {
    if (this.dataService) {
      return this.dataService.deleteMessage(id);
    }
    
    const message = memoryStore.messages.get(id);
    if (message) {
    memoryStore.messages.delete(id);
    
      const threadMessages = memoryStore.threadMessages.get(message.thread_id);
      if (threadMessages) {
    const index = threadMessages.indexOf(id);
        if (index > -1) {
      threadMessages.splice(index, 1);
        }
      }
    }
  }

  // THREAD-SYNTH RELATIONSHIPS
  async addSynthToThread(threadId: string, synthId: string, reference: COAITeamSynthReference): Promise<void> {
    if (this.dataService) {
      return this.dataService.addSynthToThread(threadId, synthId, reference);
    }
    
    if (!memoryStore.teamSynths.has(threadId)) {
      memoryStore.teamSynths.set(threadId, new Map());
    }
    memoryStore.teamSynths.get(threadId)!.set(synthId, reference);
  }

  async removeSynthFromThread(threadId: string, synthId: string): Promise<void> {
    if (this.dataService) {
      return this.dataService.removeSynthFromThread(threadId, synthId);
    }
    
    const threadSynths = memoryStore.teamSynths.get(threadId);
    if (threadSynths) {
      threadSynths.delete(synthId);
    }
  }

  async getThreadSynths(threadId: string): Promise<any[]> {
    if (this.dataService) {
      return this.dataService.getThreadSynths(threadId);
    }
    
    const threadSynths = memoryStore.teamSynths.get(threadId);
    if (!threadSynths) return [];
    
    return Array.from(threadSynths.entries()).map(([synthId, reference]) => ({
      id: uuidv4(),
      thread_id: threadId,
      synth_id: synthId,
      synth_reference: reference,
      created_at: new Date().toISOString()
    }));
  }

  // USER PREFERENCES
  async getActiveThreadId(): Promise<string | null> {
    if (this.dataService) {
      return this.dataService.getActiveThreadId();
    }
    return memoryStore.activeThreadId;
  }

  async setActiveThreadId(threadId: string | null): Promise<void> {
    if (this.dataService) {
      return this.dataService.setActiveThreadId(threadId);
    }
    memoryStore.activeThreadId = threadId;
  }

  // BUSINESS LOGIC METHODS

  /**
   * Send a message and generate AI responses
   */
  async sendMessage(threadId: string, messageData: COAIMessageData): Promise<COAIMessage> {
    const userMessage = await this.createMessage(threadId, messageData);
    
    if (this.hasRequiredApiKeys()) {
      this.generateAIResponse(threadId, messageData.content || '').catch(error => {
        console.error('Failed to generate AI response:', error);
      });
    }
    
    return userMessage;
  }

  /**
   * Generate AI responses for a thread
   */
  private async generateAIResponse(threadId: string, userMessage: string): Promise<void> {
    try {
      const threadSynths = await this.getThreadSynths(threadId);
      
      if (threadSynths.length === 0) {
        console.log('No synths in thread, skipping AI response');
        return;
      }
      
      const recentMessages = await this.fetchMessages(threadId, { limit: 20 });
    const apiKeys = this.getApiKeys();
    
    if (!apiKeys.openai) {
        console.error('No OpenAI API key available for AI response');
        return;
      }
      
      await this.generateTeamResponses(
        threadId,
        userMessage,
        threadSynths.map(ts => ({
          synthId: ts.synth_id,
          reference: ts.synth_reference
        })),
        recentMessages,
        apiKeys.openai
      );
      
    } catch (error) {
      console.error('Error generating AI response:', error);
    }
  }

  /**
   * Generate responses from team synths
   */
  private async generateTeamResponses(
    threadId: string, 
    userMessage: string, 
    teamSynths: { synthId: string; reference: COAITeamSynthReference }[],
    threadMessages: COAIMessage[],
    openaiApiKey: string
  ): Promise<void> {
    console.log(`🤖 Generating responses for ${teamSynths.length} synths in thread ${threadId}`);
    
    const chatHistory = threadMessages.map(msg => ({
      role: msg.message_data.sender === 'user' ? 'user' : 'assistant',
      content: msg.message_data.content || ''
    }));
    
    chatHistory.push({
      role: 'user',
      content: userMessage
    });
    
    // Parse mentions
    const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$)/g;
    const mentionedSynthIds: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(userMessage)) !== null) {
      const mentionName = match[1];
      
      const matchingSynth = teamSynths.find(ts => 
        ts.reference.metadata?.name?.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (matchingSynth) {
        mentionedSynthIds.push(matchingSynth.synthId);
      }
    }
    
    const activeSynths = mentionedSynthIds.length > 0 
      ? teamSynths.filter(ts => mentionedSynthIds.includes(ts.synthId))
      : teamSynths;
    
    // Generate responses sequentially
    for (const synthData of activeSynths) {
      try {
        const systemPrompt = synthData.reference.metadata?.systemPrompt || 
          `You are ${synthData.reference.metadata?.name || 'an AI assistant'}. Respond according to your role.`;
        
        // Use the correct Supabase Edge Function call
        const response = await fetch(`https://hiuinnexazfqhodamhgk.supabase.co/functions/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWlubmV4YXpmcWhvZGFtaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzU3MDIsImV4cCI6MjA0NTExMTcwMn0.iLC9JDOaaGZbsMMwTOZOCfFDdvkVZIvKU41CFoaicx0`,
          },
          body: JSON.stringify({
            messages: chatHistory,
            role: synthData.reference.metadata?.role || 'Assistant',
            model: synthData.reference.metadata?.model || 'gpt-4',
            employeePrompt: systemPrompt,
            employeeName: synthData.reference.metadata?.name || 'AI',
            openaiApiKey
          }),
        });
        
        if (!response.ok) {
          let errorData = {};
          try {
            errorData = await response.json();
          } catch {
            // Ignore JSON parsing errors
          }
          throw new Error(
            `Chat API failed: ${response.status} ${response.statusText}` +
            ((errorData as any).error ? ` - ${(errorData as any).error}` : '')
          );
        }
        
        // Handle streaming response (Server-Sent Events)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        
        console.log(`🔍 DEBUG: Starting to read streaming response for ${synthData.reference.metadata?.name}`);
        
        // Get the Zustand store for streaming
        const { getState } = await import('../../stores');
        const state = getState();
        
        // Start a streaming message
        const aiEmployee = {
          id: synthData.synthId,
          name: synthData.reference.metadata?.name || 'AI',
          role: synthData.reference.metadata?.role || 'Assistant',
          profileImage: synthData.reference.metadata?.profileImage || '/default-avatar.png',
          model: synthData.reference.metadata?.model || 'gpt-4'
        };
        
        // Start streaming message using the proper method
        const streamingMessageId = await state.startMessageStream(threadId, '', aiEmployee);
        
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log(`🔍 DEBUG: Stream finished for ${synthData.reference.metadata?.name}, total content length: ${fullContent.length}`);
                break;
              }
              
              const chunk = decoder.decode(value);
              console.log(`🔍 DEBUG: Received chunk for ${synthData.reference.metadata?.name}:`, chunk.substring(0, 200));
              
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6); // Remove 'data: ' prefix
                  
                  if (data === '[DONE]') {
                    console.log(`🔍 DEBUG: Received [DONE] signal for ${synthData.reference.metadata?.name}`);
                    break;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullContent += content;
                      console.log(`🔍 DEBUG: Added content for ${synthData.reference.metadata?.name}: "${content}"`);
                      
                      // Update the streaming message in real-time
                      state.appendToMessageStream(streamingMessageId, content);
                    }
                  } catch (parseError) {
                    console.log(`🔍 DEBUG: Failed to parse chunk for ${synthData.reference.metadata?.name}:`, parseError, 'Data:', data);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
        
        console.log(`🔍 DEBUG: Final content for ${synthData.reference.metadata?.name}: "${fullContent}"`);
        
        if (!fullContent) {
          console.error(`❌ No content received for ${synthData.reference.metadata?.name}`);
        }
        
        // Complete the streaming message
        await state.completeMessageStream(streamingMessageId);
        
        chatHistory.push({
          role: 'assistant',
          content: fullContent || 'No response generated'
        });
        
      } catch (error) {
        console.error(`Failed to generate response for ${synthData.reference.metadata?.name}:`, error);
      }
    }
  }

  /**
   * Convert legacy Team format to Thread format for UI compatibility
   */
  convertThreadsToTeams(threads: Thread[]): any[] {
    return threads.map(thread => ({
      id: thread.id,
      name: thread.title,
      members: [],
      messages: [],
      createdAt: thread.createdAt,
      isActive: true
    }));
  }

  /**
   * Convert legacy ChatMessage to COAIMessageData
   */
  convertChatMessageToMessageData(chatMessage: ChatMessage): COAIMessageData {
    return {
      content: chatMessage.content,
      sender: chatMessage.sender,
      aiEmployee: chatMessage.aiEmployee ? {
        id: chatMessage.aiEmployee.id,
        name: chatMessage.aiEmployee.name,
        role: chatMessage.aiEmployee.role,
        profileImage: chatMessage.aiEmployee.profileImage,
        model: chatMessage.aiEmployee.model
      } : undefined,
      image: chatMessage.image
    };
  }

  /**
   * Convert COAIMessage to legacy ChatMessage format
   */
  convertMessageDataToChatMessage(message: COAIMessage): ChatMessage {
    return {
      id: message.id,
      content: message.message_data.content || '',
      sender: message.message_data.sender,
      timestamp: new Date(message.created_at),
      aiEmployee: message.message_data.aiEmployee,
      image: message.message_data.image,
      isLoading: false
    };
  }
}

// Export singleton instance
export const directService = new DirectService();