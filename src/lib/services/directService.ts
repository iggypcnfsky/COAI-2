/**
 * Direct Service Implementation
 *
 * Business logic and AI orchestration. Data access goes through HttpDataService.
 */

import { v4 as uuidv4 } from 'uuid';
import { IDataService, httpDataService } from './dataService';
import { apiStream, apiUpload } from '../api/client';
import { useAppStore } from '../../stores/appStore';
import { DEFAULT_MODEL_ID } from '@shared/models';
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
import { 
  logPromptReinjection,
  createFreshStartPrompt
} from '../utils/promptReinjection';
import {
  CONTINUE_PROMPT,
} from '../chat/turnPlanner';
import { bubbleDelayMs, MAX_CHAT_BUBBLES, revealText, splitClosedChatBubbles } from '../chat/bubbles';

const memoryStore = {
  synths: new Map<string, COAISynth>(),
  teams: new Map<string, COAITeam>(),
  threads: new Map<string, Thread>(),
  messages: new Map<string, COAIMessage>(),
  teamSynths: new Map<string, Map<string, COAITeamSynthReference>>(),
  threadMessages: new Map<string, string[]>(),
  activeThreadId: null as string | null,
};

class DirectService implements IDataService {
  private dataService: IDataService = httpDataService;
  private tempUserId: string | null = null;

  setUser(_userId: string | null) {
    this.dataService = httpDataService;
  }

  private async createTempUserOnDemand(): Promise<boolean> {
    return true;
  }

  async convertTempUserToRealUser(_realUserId: string): Promise<void> {
    return;
  }

  isAuthenticated(): boolean {
    return true;
  }
  
  // Check if using temporary user (for UI logic)
  isTemporaryUser(): boolean {
    return !!this.tempUserId;
  }
  
  // Get current user ID (temporary or authenticated)
  getCurrentUserId(): string | null {
    return useAppStore.getState().user?.id || null;
  }
  
  // Get temporary user ID (for conversion purposes)
  getTempUserId(): string | null {
    return this.tempUserId;
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
    console.log('🔍 [DIRECT SERVICE] createThread called with title:', title);
    console.log('🔍 [DIRECT SERVICE] Current state - dataService:', !!this.dataService, 'tempUserId:', this.tempUserId);
    
    // If no dataService exists (unauthenticated), create temp user on demand
    if (!this.dataService) {
      console.log('🔄 No dataService found, creating temporary user on demand...');
      const tempUserCreated = await this.createTempUserOnDemand();
      
      if (!tempUserCreated) {
        console.log('⚠️ Failed to create temp user, falling back to memory storage');
        // Fall back to memory storage
        const thread: Thread = {
          id: uuidv4(),
          title,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        memoryStore.threads.set(thread.id, thread);
        console.log('✅ [DIRECT SERVICE] Created thread in memory storage:', thread.id);
        return thread;
      }
    }
    
    // Use dataService (either existing authenticated or newly created temp user)
    if (this.dataService) {
      console.log('✅ [DIRECT SERVICE] Using dataService to create thread');
      const thread = await this.dataService.createThread(title);
      console.log('✅ [DIRECT SERVICE] Thread created via dataService:', thread.id);
      return thread;
    }
    
    // Final fallback to memory storage (should rarely happen)
    console.log('⚠️ [DIRECT SERVICE] Final fallback to memory storage');
    const thread: Thread = {
      id: uuidv4(),
      title,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    memoryStore.threads.set(thread.id, thread);
    console.log('✅ [DIRECT SERVICE] Created thread in final fallback:', thread.id);
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

  async updateThreadSynthReference(threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void> {
    if (this.dataService) {
      return this.dataService.updateThreadSynthReference(threadId, synthId, reference);
    }
    
    const threadSynths = memoryStore.teamSynths.get(threadId);
    if (threadSynths && threadSynths.has(synthId)) {
      const currentReference = threadSynths.get(synthId)!;
      const updatedReference = { ...currentReference, ...reference };
      threadSynths.set(synthId, updatedReference);
    }
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
    const image = await this.persistChatImage(
      threadId,
      messageData.image as (COAIMessageData['image'] & { file?: File }) | undefined,
    );
    const persisted: COAIMessageData = image
      ? { ...messageData, image }
      : { ...messageData, image: undefined };
    const userMessage = await this.createMessage(threadId, persisted);
    this.generateAIResponse(threadId).catch((error) => {
      console.error('Failed to generate AI response:', error);
    });
    return userMessage;
  }

  async continueConversation(threadId: string): Promise<COAIMessage> {
    return this.sendMessage(threadId, {
      content: CONTINUE_PROMPT,
      sender: 'user',
    });
  }

  /**
   * Reinforce character prompts for all synths in a thread after chat clear
   * This ensures synths remember who they are when starting fresh
   */
  async reinforceCharactersAfterClear(threadId: string): Promise<void> {
    try {
      const threadSynths = await this.getThreadSynths(threadId);
      
      if (threadSynths.length === 0) {
        console.log('🔄 [FRESH START] No synths in thread, skipping character reinforcement');
        return;
      }
      
      console.log(`🔄 [FRESH START] Reinforcing character prompts for ${threadSynths.length} synths in thread ${threadId}`);
      
      // Update each synth's reference with fresh start prompt
      for (const threadSynth of threadSynths) {
        const synthId = threadSynth.synth_id;
        const currentReference = threadSynth.synth_reference;
        
        if (currentReference.metadata?.systemPrompt) {
          const originalPrompt = currentReference.metadata.systemPrompt;
          const freshPrompt = createFreshStartPrompt(originalPrompt);
          
          // Temporarily update the synth reference with fresh start prompt
          // This will be used for the next AI response
          const updatedReference = {
            ...currentReference,
            metadata: {
              ...currentReference.metadata,
              systemPrompt: freshPrompt,
              _freshStartApplied: true // Flag to track this was applied
            }
          };
          
          await this.updateThreadSynthReference(threadId, synthId, updatedReference);
          
          const characterName = currentReference.metadata?.name || 'AI';
          logPromptReinjection(characterName, 0, 'fresh_start');
          
          console.log(`✅ [FRESH START] Applied fresh start prompt to ${characterName}`);
        }
      }
      
      console.log(`✅ [FRESH START] Character reinforcement complete for thread ${threadId}`);
      
    } catch (error) {
      console.error('❌ [FRESH START] Error reinforcing characters after clear:', error);
    }
  }

  private async persistChatImage(
    threadId: string,
    image?: (COAIMessageData['image'] & { file?: File }) | undefined,
  ): Promise<COAIMessageData['image'] | undefined> {
    if (!image) return undefined;
    if (image.key && image.url && !image.base64 && !('file' in image && image.file)) {
      return {
        key: image.key,
        url: image.url,
        name: image.name,
        size: image.size,
        type: image.type,
      };
    }

    const form = new FormData();
    form.append('threadId', threadId);
    if (image.file instanceof File) {
      form.append('file', image.file);
    } else if (image.base64) {
      const binary = atob(image.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      form.append('file', new Blob([bytes], { type: image.type || 'image/png' }), image.name || 'image.png');
    } else {
      return undefined;
    }

    const uploaded = await apiUpload<{ key: string; url: string; name: string; size: number; type: string }>('/uploads', form);
    return {
      key: uploaded.key,
      url: uploaded.url,
      name: uploaded.name,
      size: uploaded.size,
      type: uploaded.type,
    };
  }

  private async generateAIResponse(threadId: string): Promise<void> {
    try {
      const threadSynths = await this.getThreadSynths(threadId);
      if (threadSynths.length === 0) return;

      const recentMessages = await this.fetchMessages(threadId, { limit: 50 });
      const { messagesToTurns, participantsFromThreadSynths, planAndRunTurns } = await import('../chat/runTeamTurn');
      const participants = participantsFromThreadSynths(threadSynths.map((ts) => ({
        synthId: ts.synth_id,
        reference: ts.synth_reference,
      })));

      await planAndRunTurns({
        participants,
        history: messagesToTurns(recentMessages),
        onFreshStart: (participant) => {
          const threadSynth = threadSynths.find((ts) => ts.synth_id === participant.synthId);
          if (!threadSynth) return;
          const resetReference = {
            ...threadSynth.synth_reference,
            metadata: {
              ...threadSynth.synth_reference.metadata,
              systemPrompt: threadSynth.synth_reference.metadata?.systemPrompt?.replace('FRESH START REMINDER: ', '') || participant.systemPrompt,
              _freshStartApplied: undefined,
            },
          };
          this.updateThreadSynthReference(threadId, participant.synthId, resetReference).catch((error) => {
            console.error('Failed to reset fresh start flag:', error);
          });
        },
        speak: async (participant, messages, systemPrompt) => {
          const employee = {
            id: participant.synthId,
            name: participant.name,
            role: participant.role,
            profileImage: participant.profileImage || '/default-avatar.png',
            model: participant.model || DEFAULT_MODEL_ID,
          };
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

          let state = useAppStore.getState();
          let streamingMessageId = await state.startMessageStream(threadId, '', employee);
          let openBuffer = '';
          let fullContent = '';
          let displayed = '';
          let bubblesEmitted = 0;

          const closeBubble = async (text: string) => {
            state = useAppStore.getState();
            state.setMessageStreamContent(streamingMessageId, text);
            await state.completeMessageStream(streamingMessageId);
            streamingMessageId = '';
            displayed = '';
            bubblesEmitted += 1;
          };

          const showText = async (target: string) => {
            state = useAppStore.getState();
            if (!streamingMessageId) {
              streamingMessageId = await state.startMessageStream(threadId, '', employee);
              displayed = '';
              state = useAppStore.getState();
            }
            await revealText(displayed, target, (text) => {
              displayed = text;
              useAppStore.getState().setMessageStreamContent(streamingMessageId, text);
            });
          };

          try {
            const response = await apiStream('/chat', {
              messages,
              role: participant.role,
              model: participant.model || DEFAULT_MODEL_ID,
              employeePrompt: systemPrompt,
              employeeName: participant.name,
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (reader) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value);
                  for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(5).trim();
                    if (!data || data === '[DONE]' || data === 'DONE') continue;
                    let content: string | undefined;
                    try {
                      const parsed = JSON.parse(data);
                      content = parsed.choices?.[0]?.delta?.content || parsed.content;
                    } catch {
                      continue;
                    }
                    if (!content) continue;

                    fullContent += content;
                    openBuffer += content;
                    const { closed, rest } = splitClosedChatBubbles(openBuffer);
                    openBuffer = rest;
                    const canClose = Math.max(0, MAX_CHAT_BUBBLES - 1 - bubblesEmitted);
                    const toClose = closed.slice(0, canClose);
                    if (closed.length > canClose) {
                      openBuffer = [...closed.slice(canClose), rest].filter(Boolean).join('\n\n');
                    }

                    for (const bubble of toClose) {
                      await showText(bubble);
                      await closeBubble(bubble);
                      await sleep(bubbleDelayMs(openBuffer || bubble));
                    }

                    if (openBuffer) {
                      await showText(openBuffer);
                    }
                  }
                }
              } finally {
                reader.releaseLock();
              }
            }

            const leftover = openBuffer.trim();
            if (leftover) {
              await showText(leftover);
              await closeBubble(leftover);
            } else if (streamingMessageId) {
              state = useAppStore.getState();
              const current = state.entities.messages[streamingMessageId];
              if (current?.message_data.content?.trim()) {
                await state.completeMessageStream(streamingMessageId);
              } else {
                state.cancelMessageStream(streamingMessageId);
              }
            }
            return fullContent;
          } catch (error) {
            if (streamingMessageId) useAppStore.getState().cancelMessageStream(streamingMessageId);
            throw error;
          }
        },
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
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