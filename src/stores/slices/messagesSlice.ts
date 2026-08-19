import { StateCreator } from 'zustand';

import { COAIMessage, COAIMessageData } from '@/types';
import { RootState, LoadingStateKey, MessageInputState } from '@/types/store';
import { normalizeArray } from '../../lib/utils/normalization';
import { httpDataService } from '@/lib/services/dataService';

// Extended COAIMessage type with optimistic flag
type ExtendedCOAIMessage = COAIMessage & { _isOptimistic?: boolean };

export interface MessagesState {
  // Actions
  fetchMessages: (threadId: string, options?: { limit?: number; before?: Date }) => Promise<COAIMessage[]>;
  getMessage: (id: string) => Promise<COAIMessage | null>;
  sendMessage: (threadId: string, messageData: COAIMessageData) => Promise<COAIMessage>;
  updateMessage: (id: string, updates: Partial<COAIMessageData>) => Promise<COAIMessage>;
  deleteMessage: (id: string) => Promise<void>;
  
  // Streaming message support
  startMessageStream: (threadId: string, initialContent: string, aiEmployee?: COAIMessageData['aiEmployee']) => Promise<string>;
  appendToMessageStream: (messageId: string, content: string) => void;
  setMessageStreamContent: (messageId: string, content: string) => void;
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
}

// Initialize message input state
const initialMessageInputState: MessageInputState = {
  text: '',
  cursorPosition: 0,
  isTriggeringAI: false,
  attachedImage: null,
  isDragOver: false,
  messageHistory: [],
  historyIndex: -1,
  selectedMentionIndex: 0
};

export const createMessagesSlice: StateCreator<
  RootState,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  MessagesState
> = (set, get) => ({
  // Actions
  fetchMessages: async (threadId: string, options = {}) => {
    const { limit = 50, before } = options;
    
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.FETCH_MESSAGES]: true
        }
      }
    }), false, 'messages/fetchMessages/start');
    
    try {
      const messagesList = await httpDataService.fetchMessages(threadId, { limit, before });
      
      // Normalize messages by ID
      const normalizedMessages = normalizeArray(messagesList);
      
      // Extract message IDs for relationship
      const messageIds = messagesList.map(message => message.id);
      
      // Update state with normalized messages
      set((state) => ({
        entities: {
          ...state.entities,
          messages: {
            ...state.entities.messages,
            ...normalizedMessages
          }
        },
        relationships: {
          ...state.relationships,
          threadMessages: {
            ...state.relationships.threadMessages,
            [threadId]: [
              ...(state.relationships.threadMessages[threadId] || []),
              ...messageIds.filter(id => 
                !(state.relationships.threadMessages[threadId] || []).includes(id)
              )
            ]
          }
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_MESSAGES]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_MESSAGES]: null
          }
        }
      }), false, 'messages/fetchMessages/success');
      
      return messagesList;
    } catch (error) {
      console.error('Error fetching messages:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_MESSAGES]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_MESSAGES]: error as Error
          }
        }
      }), false, 'messages/fetchMessages/error');
      
      return [];
    }
  },
  
  getMessage: async (id: string) => {
    const { entities } = get();
    
    // Return from cache if available
    if (entities.messages[id]) return entities.messages[id];
    
    try {
      const message = await httpDataService.getMessage(id);
      if (!message) return null;
      
      // Update store with fetched message
      set((state) => ({
        entities: {
          ...state.entities,
          messages: {
            ...state.entities.messages,
            [id]: message
          }
        },
        // Also update the thread-message relationship if needed
        relationships: {
          ...state.relationships,
          threadMessages: {
            ...state.relationships.threadMessages,
            [message.thread_id]: [
              ...(state.relationships.threadMessages[message.thread_id] || []),
              message.id
            ].filter((value, index, self) => self.indexOf(value) === index) // Ensure uniqueness
          }
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getMessage: null
          }
        }
      }), false, 'messages/getMessage/success');
      
      return message;
    } catch (error) {
      console.error(`Error fetching message ${id}:`, error);
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getMessage: error as Error
          }
        }
      }), false, 'messages/getMessage/error');
      return null;
    }
  },
  
  sendMessage: async (threadId: string, messageData: COAIMessageData) => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.SEND_MESSAGE]: true
        },
        // Ensure the active thread ID is set to the thread we're sending to
        activeThreadId: threadId
      }
    }), false, 'messages/sendMessage/start');
    
    // Create a temporary ID for optimistic updates
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create optimistic message
    const optimisticMessage: ExtendedCOAIMessage = {
      id: tempId,
      thread_id: threadId,
      message_data: messageData,
      created_at: new Date().toISOString(),
      _isOptimistic: true // Flag to identify optimistic updates
    };
    
    // Apply optimistic update
    set((state) => ({
      entities: {
        ...state.entities,
        messages: {
          ...state.entities.messages,
          [tempId]: optimisticMessage
        }
      },
      relationships: {
        ...state.relationships,
        threadMessages: {
          ...state.relationships.threadMessages,
          [threadId]: [
            ...(state.relationships.threadMessages[threadId] || []),
            tempId
          ]
        }
      }
    }), false, 'messages/sendMessage/optimisticUpdate');

    console.log('🔵 [DEBUG] messagesSlice.sendMessage: Optimistic update applied for tempId:', tempId);

    try {
      console.log('🔵 [DEBUG] messagesSlice.sendMessage: Calling directService to send message');
      
      // Import directService to handle the actual message sending
      const { directService } = await import('../../lib/services/directService');
      
      // Use directService to send the message to the backend
      const persistedMessage = await directService.sendMessage(threadId, messageData);
      
      console.log('🔵 [DEBUG] messagesSlice.sendMessage: Backend call completed for tempId:', tempId, 'new ID:', persistedMessage.id);

      // Update store with real message and remove optimistic one
      set((state) => {
        // Create a new messages object without the optimistic message
        const { [tempId]: removed, ...restMessages } = state.entities.messages;
        
        // Get current threadMessages and replace tempId with real id
        const currentThreadMessages = state.relationships.threadMessages[threadId] || [];
        const updatedThreadMessages = currentThreadMessages.map(
          id => id === tempId ? persistedMessage.id : id
        );
        
        return {
          entities: {
            ...state.entities,
            messages: {
              ...restMessages,
              [persistedMessage.id]: persistedMessage
            }
          },
          relationships: {
            ...state.relationships,
            threadMessages: {
              ...state.relationships.threadMessages,
              [threadId]: updatedThreadMessages
            }
          },
          ui: {
            ...state.ui,
            loadingStates: {
              ...state.ui.loadingStates,
              [LoadingStateKey.SEND_MESSAGE]: false
            },
            errors: {
              ...state.ui.errors,
              [LoadingStateKey.SEND_MESSAGE]: null
            }
          }
        };
      }, false, 'messages/sendMessage/success');
      
      return persistedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Revert optimistic update
      set((state) => {
        // Create a new messages object without the optimistic message
        const { [tempId]: removed, ...restMessages } = state.entities.messages;
        
        // Remove tempId from threadMessages
        const currentThreadMessages = state.relationships.threadMessages[threadId] || [];
        const updatedThreadMessages = currentThreadMessages.filter(id => id !== tempId);
        
        return {
          entities: {
            ...state.entities,
            messages: restMessages
          },
          relationships: {
            ...state.relationships,
            threadMessages: {
              ...state.relationships.threadMessages,
              [threadId]: updatedThreadMessages
            }
          },
          ui: {
            ...state.ui,
            loadingStates: {
              ...state.ui.loadingStates,
              [LoadingStateKey.SEND_MESSAGE]: false
            },
            errors: {
              ...state.ui.errors,
              [LoadingStateKey.SEND_MESSAGE]: error as Error
            }
          }
        };
      }, false, 'messages/sendMessage/revert');
      
      throw error;
    }
  },
  
  updateMessage: async (id: string, updates: Partial<COAIMessageData>) => {
    const { entities } = get();
    
    // Get current message
    const currentMessage = entities.messages[id] as ExtendedCOAIMessage;
    if (!currentMessage) {
      throw new Error(`Message with id ${id} not found`);
    }
    
    // Apply optimistic update
    const updatedMessageData = {
      ...currentMessage.message_data,
      ...updates
    };
    
    const updatedMessage = { 
      ...currentMessage,
      message_data: updatedMessageData,
    };
    
    set((state) => ({
      entities: {
        ...state.entities,
        messages: {
          ...state.entities.messages,
          [id]: updatedMessage
        }
      }
    }), false, 'messages/updateMessage/optimistic');
    
    try {
      // Only send update to database if this is not an optimistic message
      if (!currentMessage._isOptimistic) {
        const serverMessage = await httpDataService.updateMessage(id, updatedMessageData);
        
        // Update store with server data (to ensure consistency)
        set((state) => ({
          entities: {
            ...state.entities,
            messages: {
              ...state.entities.messages,
              [id]: serverMessage
            }
          }
        }), false, 'messages/updateMessage/success');
        
        return serverMessage;
      }
      
      // For optimistic messages, just return the updated message
      return updatedMessage;
    } catch (error) {
      console.error(`Error updating message ${id}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        entities: {
          ...state.entities,
          messages: {
            ...state.entities.messages,
            [id]: currentMessage
          }
        }
      }), false, 'messages/updateMessage/revert');
      
      throw error;
    }
  },
  
  deleteMessage: async (id: string) => {
    const { entities } = get();
    
    // Get current message
    const currentMessage = entities.messages[id] as ExtendedCOAIMessage;
    if (!currentMessage) {
      throw new Error(`Message with id ${id} not found`);
    }
    
    const threadId = currentMessage.thread_id;
    
    // Apply optimistic update
    set((state) => {
      // Create a new messages object without the message
      const { [id]: removed, ...restMessages } = state.entities.messages;
      
      // Remove id from threadMessages
      const currentThreadMessages = state.relationships.threadMessages[threadId] || [];
      const updatedThreadMessages = currentThreadMessages.filter(msgId => msgId !== id);
      
      return {
        entities: {
          ...state.entities,
          messages: restMessages
        },
        relationships: {
          ...state.relationships,
          threadMessages: {
            ...state.relationships.threadMessages,
            [threadId]: updatedThreadMessages
          }
        }
      };
    }, false, 'messages/deleteMessage/optimistic');
    
    try {
      // Only send delete to database if this is not an optimistic message
      if (!currentMessage._isOptimistic) {
        await httpDataService.deleteMessage(id);
      }
      
      // Success - optimistic update was correct
    } catch (error) {
      console.error(`Error deleting message ${id}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        entities: {
          ...state.entities,
          messages: {
            ...state.entities.messages,
            [id]: currentMessage
          }
        },
        relationships: {
          ...state.relationships,
          threadMessages: {
            ...state.relationships.threadMessages,
            [threadId]: [
              ...(state.relationships.threadMessages[threadId] || []),
              id
            ]
          }
        }
      }), false, 'messages/deleteMessage/revert');
      
      throw error;
    }
  },
  
  // Streaming message support
  startMessageStream: async (threadId: string, initialContent: string, aiEmployee) => {
    // Create a streaming message with the initial content
    const streamingMessageData: COAIMessageData = {
      content: initialContent,
      sender: 'ai',
      aiEmployee,
      isLoading: true,
    };
    
    // Create the message directly using directService to avoid triggering AI response
    const { directService } = await import('../../lib/services/directService');
    const message = await directService.createMessage(threadId, streamingMessageData);
    
    // Add to store optimistically
    set((state) => ({
      entities: {
        ...state.entities,
        messages: {
          ...state.entities.messages,
          [message.id]: message
        }
      },
      relationships: {
        ...state.relationships,
        threadMessages: {
          ...state.relationships.threadMessages,
          [threadId]: [
            ...(state.relationships.threadMessages[threadId] || []),
            message.id
          ]
        }
      }
    }), false, 'messages/startMessageStream');
    
    return message.id;
  },
  
  appendToMessageStream: (messageId: string, content: string) => {
    const { entities } = get();
    
    // Get current message
    const currentMessage = entities.messages[messageId];
    if (!currentMessage) {
      console.error(`Cannot append to non-existent message ${messageId}`);
      return;
    }
    
    // Update the message content
    const updatedMessageData = {
      ...currentMessage.message_data,
      content: currentMessage.message_data.content + content
    };
    
    // Apply update without waiting
    set((state) => ({
      entities: {
        ...state.entities,
        messages: {
          ...state.entities.messages,
          [messageId]: {
            ...currentMessage,
            message_data: updatedMessageData
          }
        }
      }
    }), false, 'messages/appendToMessageStream');
  },

  setMessageStreamContent: (messageId: string, content: string) => {
    const currentMessage = get().entities.messages[messageId];
    if (!currentMessage) {
      console.error(`Cannot update non-existent message ${messageId}`);
      return;
    }

    set((state) => ({
      entities: {
        ...state.entities,
        messages: {
          ...state.entities.messages,
          [messageId]: {
            ...currentMessage,
            message_data: {
              ...currentMessage.message_data,
              content,
            },
          },
        },
      },
    }), false, 'messages/setMessageStreamContent');
  },
  
  completeMessageStream: async (messageId: string) => {
    const { entities } = get();
    
    // Get current message
    const currentMessage = entities.messages[messageId];
    if (!currentMessage) {
      throw new Error(`Cannot complete non-existent message ${messageId}`);
    }
    
    // Mark the message as no longer loading
    const updatedMessageData = {
      ...currentMessage.message_data,
      isLoading: false
    };
    
    // Update the message
    await get().updateMessage(messageId, updatedMessageData);
  },
  
  cancelMessageStream: (messageId: string) => {
    // Simply delete the message
    get().deleteMessage(messageId).catch(error => {
      console.error(`Error cancelling message stream ${messageId}:`, error);
    });
  },

  // Message input actions
  setMessageInputText: (text: string) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            text
          }
        }
      }),
      false,
      'setMessageInputText'
    );
  },

  setMessageInputCursorPosition: (cursorPosition: number) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            cursorPosition
          }
        }
      }),
      false,
      'setMessageInputCursorPosition'
    );
  },

  setMessageInputIsTriggeringAI: (isTriggeringAI: boolean) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            isTriggeringAI
          }
        }
      }),
      false,
      'setMessageInputIsTriggeringAI'
    );
  },

  setMessageInputAttachedImage: (attachedImage: any | null) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            attachedImage
          }
        }
      }),
      false,
      'setMessageInputAttachedImage'
    );
  },

  setMessageInputIsDragOver: (isDragOver: boolean) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            isDragOver
          }
        }
      }),
      false,
      'setMessageInputIsDragOver'
    );
  },

  setMessageInputHistory: (messageHistory: string[]) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            messageHistory
          }
        }
      }),
      false,
      'setMessageInputHistory'
    );
  },

  setMessageInputHistoryIndex: (historyIndex: number) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            historyIndex
          }
        }
      }),
      false,
      'setMessageInputHistoryIndex'
    );
  },

  setMessageInputSelectedMentionIndex: (selectedMentionIndex: number) => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: {
            ...state.ui.messageInput,
            selectedMentionIndex
          }
        }
      }),
      false,
      'setMessageInputSelectedMentionIndex'
    );
  },

  resetMessageInput: () => {
    set(
      (state) => ({
        ui: {
          ...state.ui,
          messageInput: initialMessageInputState
        }
      }),
      false,
      'resetMessageInput'
    );
  },
}); 