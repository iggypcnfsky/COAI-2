import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamMember, ChatMessage as ChatMessageType, AIEmployee, Team } from '@/types';
import TeamMembersList from './TeamMembersList';
import YourChatsSection from './YourChatsSection';
import ChatMessage from './ChatMessage';
import MessageInputWithMentions from './MessageInputWithMentions';
import { Loader2 } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatSectionProps {
  teamMembers: TeamMember[];
  onRemoveTeamMember: (id: string) => void;
  onAddTeamMember?: (employee: AIEmployee) => void;
  onAddTeam?: (employees: AIEmployee[]) => void;
  onSelectTeamMember?: (member: TeamMember) => void;
  messages: ChatMessageType[];
  onSendMessage: (messageData: { display: string; full: string }, attachedImage?: any) => void;
  onUploadImage?: (file: File) => void;
  onAIContinue?: () => void;
  onRemoveMessage?: (messageId: string) => void;
  employees: AIEmployee[];
  teams: Team[];
  activeThreadId: string | null;
  onSelectTeam: (teamId: string) => void;
  onEditTeamName: (teamId: string, newName: string) => void;
  onCreateChat: () => void;
  onDeleteTeam: (teamId: string) => void;
  isWaitingForStream?: boolean;
  globalSpacebarCount?: number;
}

const ChatSection: React.FC<ChatSectionProps> = ({
  teamMembers,
  onRemoveTeamMember,
  onAddTeamMember,
  onAddTeam,
  onSelectTeamMember,
  messages,
  onSendMessage,
  onUploadImage,
  onAIContinue,
  onRemoveMessage,
  employees,
  teams,
  activeThreadId,
  onSelectTeam,
  onEditTeamName,
  onCreateChat,
  onDeleteTeam,
  isWaitingForStream = false,
  globalSpacebarCount = 0
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [dragType, setDragType] = React.useState<'team' | 'employee' | 'document' | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = React.useState(false);
  const [incomingMessageCount, setIncomingMessageCount] = React.useState(0);
  const [lastMessageCount, setLastMessageCount] = React.useState(0);
  const [insertDocumentMention, setInsertDocumentMention] = React.useState<((doc: Document) => void) | null>(null);

  // Track incoming messages for spacebar feedback
  useEffect(() => {
    const aiMessages = messages.filter(msg => msg.sender === 'ai');
    const newAIMessageCount = aiMessages.length;
    
    if (newAIMessageCount > lastMessageCount) {
      setIncomingMessageCount(newAIMessageCount - lastMessageCount);
      setLastMessageCount(newAIMessageCount);
      
      // Reset the incoming count after 5 seconds
      setTimeout(() => {
        setIncomingMessageCount(0);
      }, 5000);
    }
  }, [messages, lastMessageCount]);

  // Smart auto-scroll: always scroll to bottom unless user has manually scrolled up
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    
    // Always auto-scroll unless user has manually scrolled up
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isUserScrolledUp]);

  // Track user scroll position to determine if they've scrolled up
  const handleScroll = React.useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom < 50;
      

      
      // Update the scroll state: if user is at bottom, resume auto-scroll
      setIsUserScrolledUp(!isAtBottom);
    }
  }, []);

  // Set up scroll event listener for the viewport
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
    
    // Try to determine what's being dragged
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
      // If we can't parse the data, assume it's an employee (default)
      setDragType('employee');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set isDragOver to false if we're actually leaving the chat section
    // Check if the related target is outside the chat section
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
      setDragType(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
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
      
      // Check if this is a document drop
      if (parsedData.type === 'document' && parsedData.document) {
        // Handle document drop - insert as mention in chat input
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
      // Check if this is a team drop (regular team or custom team) or individual employee drop
      else if ((parsedData.type === 'team' || parsedData.type === 'custom-team') && parsedData.employees) {
        // Handle team drop - add all employees from the team at once
        if (onAddTeam) {
          onAddTeam(parsedData.employees);
        }
      } else {
        // Handle individual employee drop (legacy behavior)
        const employee = parsedData;
        const isAlreadyMember = teamMembers.some(member => member.id === employee.id);
        if (!isAlreadyMember && onAddTeamMember) {
          onAddTeamMember(employee);
        }
      }
    } catch (error) {
      console.error('Error parsing dropped data:', error);
    }
  };

  // Filter out any demo messages (just in case)
  const displayMessages = messages.filter(msg => !msg.id.startsWith('demo'));

  return (
    <div 
      className={`flex flex-col h-full bg-white dark:bg-neutral-900 transition-all duration-200 relative ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Enhanced drop zone overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100/80 dark:bg-blue-900/30 border-4 border-blue-400 dark:border-blue-500 border-dashed z-40 pointer-events-none">
          <div className="absolute inset-4 bg-blue-200/50 dark:bg-blue-800/30 border-2 border-blue-300 dark:border-blue-600 border-dashed rounded-lg"></div>
        </div>
      )}
      
      {/* Main content area - adjusted for mobile input positioning */}
      <div className="flex flex-col flex-1 md:h-full overflow-hidden">
        <YourChatsSection
          teams={teams}
          activeThreadId={activeThreadId}
          onSelectTeam={onSelectTeam}
          onEditTeamName={onEditTeamName}
          onCreateChat={onCreateChat}
          onDeleteTeam={onDeleteTeam}
        />
        
        <TeamMembersList
          teamMembers={teamMembers}
          onRemoveTeamMember={onRemoveTeamMember}
          onAddTeamMember={onAddTeamMember}
          onSelectTeamMember={onSelectTeamMember}
        />
        
        <ScrollArea 
          ref={scrollAreaRef}
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
                  onRemoveMessage={onRemoveMessage}
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Message Input - Fixed to bottom on mobile, normal position on desktop */}
      <div className="md:relative fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:bottom-auto bg-white dark:bg-neutral-900 z-50 md:z-auto border-t md:border-t-0 border-neutral-200 dark:border-neutral-800">
        <MessageInputWithMentions
          onSendMessage={onSendMessage}
          onUploadImage={onUploadImage}
          onAIContinue={onAIContinue}
          employees={employees}
          teamMembers={teamMembers}
          isWaitingForStream={isWaitingForStream}
          incomingMessageCount={incomingMessageCount}
          globalSpacebarCount={globalSpacebarCount}
          onSetDocumentMentionHandler={(handler) => {
            setInsertDocumentMention(() => handler);
          }}
        />
      </div>
    </div>
  );
};

export default ChatSection;