import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { COAIMessage, COAIMessageData } from '../../types';

import { useThreads } from './useThreads';
import { RootState } from '../../types/store';

/**
 * Hook for interacting with messages in the application
 */
export function useMessages(threadId?: string) {
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
  const getMessage = useAppStore((state) => state.getMessage);
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
    if (!effectiveThreadId || !hasMoreMessages || !oldestMessageDate) return;
    
    try {
      const messagesList = await fetchMessages(effectiveThreadId, {
        before: oldestMessageDate,
        limit: 50
      });
      
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
      console.error('Error loading more messages:', error);
      setHasMoreMessages(false);
    }
  }, [effectiveThreadId, fetchMessages, hasMoreMessages, oldestMessageDate]);
  
  // Get thread messages list - with stable reference
  const threadMessages = useMemo(() => {
    if (!threadMessagesRelationships || !Array.isArray(threadMessagesRelationships) || threadMessagesRelationships.length === 0) {
      return [];
    }
    
    return threadMessagesRelationships
      .map((id: string) => messages[id])
      .filter(Boolean)
      .sort((a: COAIMessage, b: COAIMessage) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, threadMessagesRelationships]);
  
  // Helper to send a user message to the thread
  const sendUserMessage = useCallback(
    async (content: string) => {
      if (!effectiveThreadId) {
        throw new Error('No active thread');
      }
      
      const messageData: COAIMessageData = {
        content,
        sender: 'user'
      };
      
      try {
        const result = await sendMessage(effectiveThreadId, messageData);
        return result;
      } catch (error) {
        throw error;
      }
    },
    [effectiveThreadId, sendMessage]
  );
  
  // Helper to send an AI message to the thread
  const sendAiMessage = useCallback(
    async (content: string, aiEmployee?: COAIMessageData['aiEmployee']) => {
      if (!effectiveThreadId) throw new Error('No active thread');
      
      const messageData: COAIMessageData = {
        content,
        sender: 'ai',
        aiEmployee
      };
      
      return sendMessage(effectiveThreadId, messageData);
    },
    [effectiveThreadId, sendMessage]
  );
  
  // Helper to start streaming an AI message
  const streamAiMessage = useCallback(
    async (initialContent: string, aiEmployee?: COAIMessageData['aiEmployee']) => {
      if (!effectiveThreadId) throw new Error('No active thread');
      
      return startMessageStream(effectiveThreadId, initialContent, aiEmployee);
    },
    [effectiveThreadId, startMessageStream]
  );
  
  // Create a stable reference to the return object
  return useMemo(() => ({
    // State
    messages: threadMessages,
    hasMoreMessages,
    isLoading,
    isSending,
    
    // Message actions
    fetchMessages,
    loadMoreMessages,
    getMessage,
    sendMessage,
    sendUserMessage,
    sendAiMessage,
    updateMessage,
    deleteMessage,
    
    // Streaming support
    startMessageStream,
    streamAiMessage,
    appendToMessageStream,
    completeMessageStream,
    cancelMessageStream,
  }), [
    threadMessages,
    hasMoreMessages,
    isLoading,
    isSending,
    fetchMessages,
    loadMoreMessages,
    getMessage,
    sendMessage,
    sendUserMessage,
    sendAiMessage,
    updateMessage,
    deleteMessage,
    startMessageStream,
    streamAiMessage,
    appendToMessageStream,
    completeMessageStream,
    cancelMessageStream
  ]);
}

/**
 * Hook for interacting with the message input state
 */
export function useMessageInput() {
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
  const setSelectedMentionIndex = useAppStore((state) => state.setMessageInputSelectedMentionIndex);
  const wrappedSetSelectedMentionIndex = useCallback((value: number | ((prev: number) => number)) => {
    if (typeof value === 'function') {
      const updater = value as (prev: number) => number;
      setSelectedMentionIndex(updater(selectedMentionIndex));
    } else {
      setSelectedMentionIndex(value);
    }
  }, [selectedMentionIndex, setSelectedMentionIndex]);
  
  const resetMessageInput = useAppStore((state) => state.resetMessageInput);
  
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
    setCursorPosition: setCursorPosition,
    setIsTriggeringAI,
    setAttachedImage,
    setIsDragOver,
    setMessageHistory,
    setHistoryIndex,
    setSelectedMentionIndex: wrappedSetSelectedMentionIndex,
    resetMessageInput,
  };
} 