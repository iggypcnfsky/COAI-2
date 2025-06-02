import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamMember, ChatMessage as ChatMessageType, AIEmployee, Team } from '@/types';
import TeamMembersList from './TeamMembersList';
import YourChatsSection from './YourChatsSection';
import ChatMessage from './ChatMessage';
import MessageInputWithMentions from './MessageInputWithMentions';
import { Loader2 } from 'lucide-react';
import { useMessages } from '@/hooks/store/useMessages';

import { COAIMessage } from '@/types';
import { useAppStore } from '@/stores/appStore';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}



// Normalize messages to ensure they follow the same structure - moved outside component to prevent recreation
const normalizeMessage = (msg: ChatMessageType | COAIMessage): ChatMessageType => {
  if ('message_data' in msg) {
    const timestamp = msg.created_at ? new Date(msg.created_at) : new Date();
    return {
      id: msg.id,
      content: msg.message_data.content || '',
      sender: msg.message_data.sender as 'user' | 'ai' || 'ai',
      timestamp,
      aiEmployee: msg.message_data.aiEmployee,
      ...msg.message_data.metadata
    } as ChatMessageType;
  }
  return msg as ChatMessageType;
};

interface ChatSectionProps {
  teamMembers: TeamMember[];
  onRemoveTeamMember: (id: string) => void;
  onAddTeamMember?: (employee: AIEmployee) => void;
  onAddTeam?: (employees: AIEmployee[]) => void;
  onSelectTeamMember?: (member: TeamMember) => void;
  messages?: ChatMessageType[]; // Make optional to use Zustand when available
  onSendMessage?: (messageData: { display: string; full: string }, attachedImage?: any) => void; // Make optional
  onUploadImage?: (file: File) => void;
  onAIContinue?: () => void;
  onRemoveMessage?: (messageId: string) => void;
  employees: AIEmployee[];
  threads: Team[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onEditThreadName: (threadId: string, newName: string) => void;
  onCreateChat: () => void;
  onDeleteThread: (threadId: string) => void;
  onClearChat?: () => void;
  isWaitingForStream?: boolean;
  globalSpacebarCount?: number;
}

const ChatSection: React.FC<ChatSectionProps> = ({
  teamMembers,
  onRemoveTeamMember,
  onAddTeamMember,
  onAddTeam,
  onSelectTeamMember,

  onSendMessage: propsSendMessage,
  onUploadImage,
  onAIContinue: propsAIContinue,
  onRemoveMessage: propsRemoveMessage,
  employees,
  threads,
  activeThreadId,
  onSelectThread,
  onEditThreadName,
  onCreateChat,
  onDeleteThread,
  onClearChat,
  isWaitingForStream: propsIsWaitingForStream = false,
  globalSpacebarCount = 0
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [dragType, setDragType] = React.useState<'team' | 'employee' | 'document' | null>(null);
  const [incomingMessageCount, setIncomingMessageCount] = React.useState(0);
  const [lastMessageCount, setLastMessageCount] = React.useState(0);
  const [insertDocumentMention, setInsertDocumentMention] = React.useState<((doc: Document) => void) | null>(null);

  const { 
    isSending,
    isLoading: isMessagesLoading,
    sendUserMessage,
    deleteMessage,
    streamAiMessage,
    fetchMessages,
  } = useMessages(activeThreadId || undefined);


  
  // Listen for refresh messages loading state
  const shouldRefreshMessages = useAppStore(state => state.ui.loadingStates?.refreshMessages);
  
  // Effect to refresh messages when the refresh flag is set
  useEffect(() => {
    if (shouldRefreshMessages && activeThreadId) {
      console.log('🔄 [DEBUG] Detected refreshMessages flag, refreshing messages');
      fetchMessages(activeThreadId).catch(error => {
        console.error('❌ [DEBUG] Error refreshing messages:', error);
      });
    }
  }, [shouldRefreshMessages, activeThreadId, fetchMessages]);

  // Get messages from the store
  const messages = useAppStore((state) => state.entities.messages);
  const threadMessages = useAppStore((state) => state.relationships.threadMessages);
  
  // Get messages for the active thread
  const activeThreadMessages = useMemo(() => {
    if (!activeThreadId || !threadMessages[activeThreadId]) {
      return [];
    }
    
    const messageIds = threadMessages[activeThreadId];
    const threadMessagesList = messageIds
      .map(id => messages[id])
      .filter(Boolean)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Debug logging removed to reduce console noise
    return threadMessagesList;
  }, [activeThreadId, threadMessages, messages]);
  
  const isWaitingForStream = propsIsWaitingForStream || isSending;

  const handleSendMessage = useCallback(async (messageData: { display: string; full: string }, attachedImage?: any) => {
    console.log('🔍 [DEBUG] ChatSection.handleSendMessage called:', {
      messageLength: messageData.full.length,
      activeThreadId,
      hasAttachedImage: !!attachedImage
    });
    
    if (activeThreadId) {
      console.log('✅ [DEBUG] Using existing thread:', activeThreadId);
      await sendUserMessage(messageData.full);
    } else {
      console.log('⚠️ [DEBUG] No active thread, creating one...');
      
      try {
        // Import directService
        const { directService } = await import('../../lib/services/directService');
        const { useAppStore } = await import('../../stores/appStore');
        
        // Create a new thread
        const threadTitle = `Chat ${new Date().toLocaleString()}`;
        const newThread = await directService.createThread(threadTitle);
        console.log('✅ [DEBUG] Thread created:', newThread);
        
        // Set as active thread in the store
        useAppStore.setState(state => {
          console.log('🔍 [DEBUG] Setting activeThreadId in store, before:', state.ui.activeThreadId);
          return {
            ui: {
              ...state.ui,
              activeThreadId: newThread.id
            }
          };
        });
        
        // Get current state to verify thread was set
        const currentState = useAppStore.getState();
        console.log('✅ [DEBUG] Thread set in store:', {
          newThreadId: newThread.id,
          storeActiveThreadId: currentState.ui.activeThreadId,
          match: currentState.ui.activeThreadId === newThread.id
        });
        
        // Send message directly via service
        console.log('🔍 [DEBUG] Sending message to new thread via directService');
        await directService.sendMessage(newThread.id, {
          content: messageData.full,
          sender: 'user'
        });
      } catch (error) {
        console.error('❌ [DEBUG] Error with thread creation/message:', error);
        
        // Use props method as fallback if available
        if (propsSendMessage) {
          console.log('⚠️ [DEBUG] Falling back to props.onSendMessage');
          propsSendMessage(messageData, attachedImage);
        } else {
          console.error('❌ [DEBUG] No way to send message - both approaches failed');
        }
      }
    }
  }, [activeThreadId, sendUserMessage, propsSendMessage]);

  const handleRemoveMessage = useCallback((messageId: string) => {
    if (activeThreadId) {
      deleteMessage(messageId).catch(err => {
        console.error('Failed to delete message:', err);
      });
    } else if (propsRemoveMessage) {
      propsRemoveMessage(messageId);
    }
  }, [activeThreadId, deleteMessage, propsRemoveMessage]);

  const handleAIContinue = useCallback(() => {
    if (activeThreadId && teamMembers.length > 0) {
      const lastAI = teamMembers[0];
      
      streamAiMessage('', {
        id: lastAI.id,
        name: lastAI.name,
        role: lastAI.role,
        profileImage: lastAI.profileImage,
        model: lastAI.model || 'gpt-4'
      });
    } else if (propsAIContinue) {
      propsAIContinue();
    }
  }, [activeThreadId, teamMembers, streamAiMessage, propsAIContinue]);

  useEffect(() => {
    const aiMessages = activeThreadMessages.filter(msg => {
      if ('message_data' in msg && msg.message_data) {
        return msg.message_data.sender === 'ai';
      }
      return 'sender' in msg && msg.sender === 'ai';
    });
    
    const newAIMessageCount = aiMessages.length;
    
    if (newAIMessageCount > lastMessageCount) {
      setIncomingMessageCount(newAIMessageCount - lastMessageCount);
      setLastMessageCount(newAIMessageCount);
      
      setTimeout(() => {
        setIncomingMessageCount(0);
      }, 5000);
    }
  }, [activeThreadMessages, lastMessageCount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Only scroll if there are messages and messagesEndRef is available
    if (messagesEndRef.current && activeThreadMessages.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [activeThreadMessages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (dragData) {
        const parsedData = JSON.parse(dragData);
        if (parsedData.type === 'document') {
          setDragType('document');
        } else if (parsedData.type === 'team' || parsedData.type === 'custom-team') {
          setDragType('team');
        } else {
          setDragType('employee');
        }
      }
    } catch (error) {
      setDragType('employee');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
      setDragType(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragType(null);
    
    console.log('🚨 [CHAT SECTION DROP DEBUG] === CHAT SECTION DROP EVENT ===');
    console.log('🚨 [CHAT SECTION DROP DEBUG] Drop event in ChatSection:', e);
    console.log('🚨 [CHAT SECTION DROP DEBUG] DataTransfer types:', Array.from(e.dataTransfer.types));
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      console.log('🚨 [CHAT SECTION DROP DEBUG] Drag data:', dragData);
      const parsedData = JSON.parse(dragData);
      console.log('🚨 [CHAT SECTION DROP DEBUG] Parsed data:', parsedData);
      
      if (parsedData.type === 'document' && parsedData.document) {
        const doc = parsedData.document;
        console.log('🚨 [CHAT SECTION DROP DEBUG] Document detected:', doc);
        console.log('🚨 [CHAT SECTION DROP DEBUG] insertDocumentMention handler exists:', !!insertDocumentMention);
        
        if (insertDocumentMention && doc && doc.title) {
          console.log('🚨 [CHAT SECTION DROP DEBUG] Calling insertDocumentMention with doc:', doc.title);
          insertDocumentMention(doc);
        } else {
          console.error('Invalid document or missing mention handler:', { doc, hasHandler: !!insertDocumentMention });
        }
      }
      else if ((parsedData.type === 'team' || parsedData.type === 'custom-team') && parsedData.employees) {
        if (onAddTeam) {
          onAddTeam(parsedData.employees);
        }
      } else {
        const employee = parsedData;
        const isAlreadyMember = teamMembers.some(member => member.id === employee.id);
        if (!isAlreadyMember && onAddTeamMember) {
          onAddTeamMember(employee);
        }
      }
    } catch (error) {
      console.error('Error parsing dropped data:', error);
    }
  }, [insertDocumentMention, onAddTeam, onAddTeamMember, teamMembers]);

  // Memoize the filtered and normalized messages to prevent recreation on each render
  const displayMessages = useMemo(() => {
    const filtered = activeThreadMessages
      .filter(msg => !msg.id.startsWith('demo'))
      .map(normalizeMessage);
      
    return filtered;
  }, [activeThreadMessages]);

  // Function to set document mention handler
  const handleSetDocumentMentionHandler = useCallback((handler: ((doc: Document) => void) | null) => {
    setInsertDocumentMention(handler);
  }, []);

  return (
    <div 
      className={`flex flex-col h-full bg-white dark:bg-neutral-900 transition-all duration-200 relative ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100/80 dark:bg-blue-900/30 border-4 border-blue-400 dark:border-blue-500 border-dashed z-40 pointer-events-none">
          <div className="absolute inset-4 bg-blue-200/50 dark:bg-blue-800/30 border-2 border-blue-300 dark:border-blue-600 border-dashed rounded-lg"></div>
        </div>
      )}
      
      <div className="flex flex-col flex-1 md:h-full overflow-hidden">
        <YourChatsSection
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={onSelectThread}
          onEditThreadName={onEditThreadName}
          onCreateChat={onCreateChat}
          onDeleteThread={onDeleteThread}
          onClearChat={onClearChat}
          hasMessages={displayMessages.length > 0}
        />
        
        <TeamMembersList
          teamMembers={teamMembers}
          onRemoveTeamMember={onRemoveTeamMember}
          onAddTeamMember={onAddTeamMember}
          onSelectTeamMember={onSelectTeamMember}
        />
        
        <ScrollArea 
          className="flex-grow px-4 pb-20 md:pb-4"
        >
          {isDragOver && (
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-neutral-800 border-4 border-blue-500 dark:border-blue-400 border-dashed rounded-xl p-8 shadow-2xl transform scale-110 animate-pulse">
                <div className="text-center">
                  {dragType === 'document' ? (
                    <>
                      <div className="text-6xl mb-4 animate-bounce">📄</div>
                      <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2">
                        Drop to mention in chat!
                      </h3>
                      <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                        Release to add as file mention
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4 animate-bounce">👥</div>
                      <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2">
                        Drop to add to team!
                      </h3>
                      <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                        Release to add to your current team
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {displayMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md space-y-4">
                {teamMembers.length === 0 ? (
                  <>
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                      Welcome to COAI!
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Start by adding AI team members from the left panel, then begin your conversation with your AI team.
                    </p>
                    <div className="text-sm text-neutral-400 dark:text-neutral-500 space-y-1">
                      <p>💡 <strong>Tip:</strong> Click the "+" icon or drag and drop employees to add them to your team</p>
                      <p>💬 <strong>Mention AIs:</strong> Use @Name to direct messages to specific team members</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                      Your team is ready!
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Start the conversation with your AI team members. Type a message below to begin.
                    </p>
                    <div className="text-sm text-neutral-400 dark:text-neutral-500">
                      <p>💡 All team members will respond, or use @Name to mention specific ones</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              {displayMessages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  employees={employees}
                  onRemoveMessage={handleRemoveMessage}
                />
              ))}
              {isWaitingForStream && (
                <div className="flex justify-center mb-4">
                  <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI team is thinking...</span>
                  </div>
                </div>
              )}
              {isMessagesLoading && (
                <div className="flex justify-center mb-4">
                  <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading messages...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>
      
      <div className="md:relative fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:bottom-auto bg-white dark:bg-neutral-900 z-50 md:z-auto border-t md:border-t-0 border-neutral-200 dark:border-neutral-800">
        <MessageInputWithMentions
          onSendMessage={handleSendMessage}
          onUploadImage={onUploadImage}
          onAIContinue={handleAIContinue}
          employees={employees}
          teamMembers={teamMembers}
          isWaitingForStream={isWaitingForStream}
          incomingMessageCount={incomingMessageCount}
          globalSpacebarCount={globalSpacebarCount}
          onSetDocumentMentionHandler={handleSetDocumentMentionHandler}
        />
      </div>
    </div>
  );
};

export default ChatSection;