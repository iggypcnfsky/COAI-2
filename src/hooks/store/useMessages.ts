import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { COAIMessageData } from '../../types';

import { useThreads } from './useThreads';
import { RootState } from '../../types/store';

/**
 * Hook for interacting with messages in the application
 */
export function useMessages(threadId?: string) {
  // Check if store is initialized to prevent null errors
  const storeExists = useAppStore.getState !== undefined;
  
  if (!storeExists) {
    // Return safe defaults if store is not initialized
    return {
      messages: [],
      isLoading: false,
      isSending: false,
      hasMoreMessages: false,
      loadMoreMessages: async () => {},
      loadInitialMessages: async () => {},
      sendMessage: async () => null,
      updateMessage: async () => null,
      deleteMessage: async () => {},
      startMessageStream: () => '',
      appendToMessageStream: () => {},
      completeMessageStream: () => {},
      cancelMessageStream: () => {},
    };
  }

  // Local state for pagination
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageDate, setOldestMessageDate] = useState<Date | null>(null);
  
  // Get active thread if threadId not provided
  const { activeThreadId } = useThreads();
  const effectiveThreadId = threadId || activeThreadId;
  
  // Stable selector references
  const messagesSelector = useCallback((state: RootState) => state.entities.messages, []);
  
  const threadMessagesSelector = useCallback((state: RootState) => 
    effectiveThreadId ? state.relationships.threadMessages[effectiveThreadId] : undefined, 
  [effectiveThreadId]);
  
  // Use selectors with useAppStore
  const messages = useAppStore(messagesSelector);
  const threadMessagesRelationships = useAppStore(threadMessagesSelector);
  const isLoading = useAppStore((state) => state.ui.loadingStates.fetchMessages);
  const isSending = useAppStore((state) => state.ui.loadingStates.sendMessage);
  
  // Get actions from store (these don't change so no need to memoize)
  const fetchMessages = useAppStore((state) => state.fetchMessages);
  const sendMessage = useAppStore((state) => state.sendMessage);
  const updateMessage = useAppStore((state) => state.updateMessage);
  const deleteMessage = useAppStore((state) => state.deleteMessage);
  const startMessageStream = useAppStore((state) => state.startMessageStream);
  const appendToMessageStream = useAppStore((state) => state.appendToMessageStream);
  const completeMessageStream = useAppStore((state) => state.completeMessageStream);
  const cancelMessageStream = useAppStore((state) => state.cancelMessageStream);
  
  // Fetch messages on initial load and when threadId changes
  useEffect(() => {
    if (effectiveThreadId) {
      loadInitialMessages();
    }
    // Reset pagination when thread changes
    setHasMoreMessages(true);
    setOldestMessageDate(null);
  }, [effectiveThreadId]);
  
  // Function to load initial messages
  const loadInitialMessages = useCallback(async () => {
    if (!effectiveThreadId) return;
    
    try {
      const messagesList = await fetchMessages(effectiveThreadId);
      
      // Update oldest message date for pagination
      if (messagesList.length > 0) {
        const dates = messagesList.map(msg => new Date(msg.created_at));
        const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
        setOldestMessageDate(oldest);
        // If we got fewer messages than the limit, we've reached the end
        setHasMoreMessages(messagesList.length >= 50);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading initial messages:', error);
      setHasMoreMessages(false);
    }
  }, [effectiveThreadId, fetchMessages]);
  
  // Function to load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!effectiveThreadId || !hasMoreMessages || isLoading || !oldestMessageDate) {
      return;
    }
    
    try {
      const messagesList = await fetchMessages(effectiveThreadId, { 
        limit: 50, 
        before: oldestMessageDate 
      });
      
      // Update oldest message date for next pagination
      if (messagesList.length > 0) {
        const dates = messagesList.map(msg => new Date(msg.created_at));
        const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
        setOldestMessageDate(oldest);
        // If we got fewer messages than the limit, we've reached the end
        setHasMoreMessages(messagesList.length >= 50);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      setHasMoreMessages(false);
    }
  }, [effectiveThreadId, hasMoreMessages, isLoading, oldestMessageDate, fetchMessages]);
  
  // Get messages for the current thread
  const threadMessages = useMemo(() => {
    if (!effectiveThreadId || !threadMessagesRelationships || !messages) {
      return [];
    }
    
    const messageIds = threadMessagesRelationships;
    if (!messageIds) return [];
    
    return messageIds
      .map((id) => messages[id])
      .filter(Boolean)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [effectiveThreadId, threadMessagesRelationships, messages]);
  
  // Send a message to the current thread
  const sendMessageToThread = useCallback(async (messageData: COAIMessageData) => {
    if (!effectiveThreadId) {
      throw new Error('No active thread');
    }
    
    return await sendMessage(effectiveThreadId, messageData);
  }, [effectiveThreadId, sendMessage]);
  
  // Update a message
  const updateMessageInThread = useCallback(async (messageId: string, updates: Partial<COAIMessageData>) => {
    return await updateMessage(messageId, updates);
  }, [updateMessage]);
  
  // Delete a message
  const deleteMessageFromThread = useCallback(async (messageId: string) => {
    await deleteMessage(messageId);
  }, [deleteMessage]);
  
  // Start a streaming message
  const startStreamingMessage = useCallback((initialContent: string, aiEmployee?: COAIMessageData['aiEmployee']) => {
    if (!effectiveThreadId) {
      throw new Error('No active thread');
    }
    
    return startMessageStream(effectiveThreadId, initialContent, aiEmployee);
  }, [effectiveThreadId, startMessageStream]);
  
  // Append to streaming message
  const appendToStream = useCallback((messageId: string, content: string) => {
    appendToMessageStream(messageId, content);
  }, [appendToMessageStream]);
  
  // Complete streaming message
  const completeStream = useCallback((messageId: string) => {
    completeMessageStream(messageId);
  }, [completeMessageStream]);
  
  // Cancel streaming message
  const cancelStream = useCallback((messageId: string) => {
    cancelMessageStream(messageId);
  }, [cancelMessageStream]);
  
  return {
    // Data
    messages: threadMessages,
    isLoading,
    isSending,
    hasMoreMessages,
    
    // Actions
    loadMoreMessages,
    loadInitialMessages,
    sendMessage: sendMessageToThread,
    updateMessage: updateMessageInThread,
    deleteMessage: deleteMessageFromThread,
    
    // Streaming actions
    startMessageStream: startStreamingMessage,
    appendToMessageStream: appendToStream,
    completeMessageStream: completeStream,
    cancelMessageStream: cancelStream,
  };
}

/**
 * Hook for interacting with the message input state
 */
export function useMessageInput() {
  // Check if store is initialized to prevent null errors
  const storeExists = useAppStore.getState !== undefined;
  
  if (!storeExists) {
    // Return safe defaults if store is not initialized
    return {
      text: '',
      cursorPosition: 0,
      isTriggeringAI: false,
      attachedImage: null,
      isDragOver: false,
      messageHistory: [],
      historyIndex: -1,
      selectedMentionIndex: 0,
      setText: () => {},
      setCursorPosition: () => {},
      setIsTriggeringAI: () => {},
      setAttachedImage: () => {},
      setIsDragOver: () => {},
      setMessageHistory: () => {},
      setHistoryIndex: () => {},
      setSelectedMentionIndex: () => {},
      clearInput: () => {},
      addToHistory: () => {},
      navigateHistory: () => {},
    };
  }

  // Select state from the store
  const text = useAppStore((state) => state.ui?.messageInput?.text || '');
  const cursorPosition = useAppStore((state) => state.ui?.messageInput?.cursorPosition || 0);
  const isTriggeringAI = useAppStore((state) => state.ui?.messageInput?.isTriggeringAI || false);
  const attachedImage = useAppStore((state) => state.ui?.messageInput?.attachedImage || null);
  const isDragOver = useAppStore((state) => state.ui?.messageInput?.isDragOver || false);
  const messageHistory = useAppStore((state) => state.ui?.messageInput?.messageHistory || []);
  const historyIndex = useAppStore((state) => state.ui?.messageInput?.historyIndex || -1);
  const selectedMentionIndex = useAppStore((state) => state.ui?.messageInput?.selectedMentionIndex || 0);
  
  // Get actions from store with proper types
  const setMessageInputText = useAppStore((state) => state.setMessageInputText);
  const setCursorPosition = useAppStore((state) => state.setMessageInputCursorPosition);
  const setIsTriggeringAI = useAppStore((state) => state.setMessageInputIsTriggeringAI);
  const setAttachedImage = useAppStore((state) => state.setMessageInputAttachedImage);
  const setIsDragOver = useAppStore((state) => state.setMessageInputIsDragOver);
  const setMessageHistory = useAppStore((state) => state.setMessageInputHistory);
  const setHistoryIndex = useAppStore((state) => state.setMessageInputHistoryIndex);
  
  // Wrapping the function to ensure it accepts both number and updater function
  const setSelectedMentionIndexStore = useAppStore((state) => state.setMessageInputSelectedMentionIndex);
  
  const setSelectedMentionIndex = useCallback((value: number | ((prev: number) => number)) => {
    if (typeof value === 'function') {
      const updater = value as (prev: number) => number;
      setSelectedMentionIndexStore(updater(selectedMentionIndex));
    } else {
      setSelectedMentionIndexStore(value);
    }
  }, [selectedMentionIndex, setSelectedMentionIndexStore]);
  
  // Helper functions
  const clearInput = useCallback(() => {
    setMessageInputText('');
    setCursorPosition(0);
    setAttachedImage(null);
    setIsTriggeringAI(false);
  }, [setMessageInputText, setCursorPosition, setAttachedImage, setIsTriggeringAI]);
  
  const addToHistory = useCallback((message: string) => {
    if (message.trim()) {
      const newHistory = [message, ...messageHistory.filter(h => h !== message)].slice(0, 50);
      setMessageHistory(newHistory);
      setHistoryIndex(-1);
    }
  }, [messageHistory, setMessageHistory, setHistoryIndex]);
  
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (messageHistory.length === 0) return;
    
    let newIndex = historyIndex;
    
    if (direction === 'up') {
      newIndex = Math.min(historyIndex + 1, messageHistory.length - 1);
    } else {
      newIndex = Math.max(historyIndex - 1, -1);
    }
    
    setHistoryIndex(newIndex);
    
    if (newIndex === -1) {
      setMessageInputText('');
    } else {
      setMessageInputText(messageHistory[newIndex]);
    }
  }, [historyIndex, messageHistory, setHistoryIndex, setMessageInputText]);
  
  return {
    // State
    text,
    cursorPosition,
    isTriggeringAI,
    attachedImage,
    isDragOver,
    messageHistory,
    historyIndex,
    selectedMentionIndex,
    
    // Actions
    setText: setMessageInputText,
    setCursorPosition,
    setIsTriggeringAI,
    setAttachedImage,
    setIsDragOver,
    setMessageHistory,
    setHistoryIndex,
    setSelectedMentionIndex,
    
    // Helper functions
    clearInput,
    addToHistory,
    navigateHistory,
  };
} 