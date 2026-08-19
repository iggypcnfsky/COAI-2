import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, AIEmployee, TeamMember } from '@/types';
import { MODEL_CATALOG } from '@shared/models';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelSelectItems } from '@/components/ModelSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MarkdownRenderer from './MarkdownRenderer';
import { getRoleInfo } from '@/lib/roleColors';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { useAuth } from '@/hooks/store/useAuth';

interface ChatMessageProps {
  message: ChatMessageType;
  isDemo?: boolean;
  employees?: AIEmployee[];
  onRemoveMessage?: (messageId: string) => void;
  onUpdateSynthModel?: (synthId: string, newModel: string) => void;
  teamMembers?: TeamMember[];
  isContinuation?: boolean;
  hasFollowUp?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isDemo = false, 
  employees = [], 
  onRemoveMessage,
  onUpdateSynthModel,
  teamMembers = [],
  isContinuation = false,
  hasFollowUp = false,
}) => {
  const isUserMessage = message.sender === 'user';
  const formattedTime = format(message.timestamp, 'h:mm a');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const { user, profile } = useAuth();
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    profile?.profile_data?.displayName ||
    user?.email ||
    'You';
  const userAvatar = user?.imageUrl || profile?.profile_data?.avatar;
  
  // Get current synth model from team members (live data) instead of message data (historical)
  const getCurrentSynthModel = () => {
    if (!message.aiEmployee) return null;
    
    const currentTeamMember = teamMembers.find(member => member.id === message.aiEmployee?.id);
    return currentTeamMember?.model || message.aiEmployee.model;
  };
  
  const currentModel = getCurrentSynthModel();
  
  const getModelInfo = (model: string) => {
    const match = MODEL_CATALOG.find((item) => item.id === model);
    return { display: match?.label || model };
  };

  const handleModelChange = (newModel: string) => {
    if (message.aiEmployee && onUpdateSynthModel) {
      onUpdateSynthModel(message.aiEmployee.id, newModel);
    }
    setIsModelSelectorOpen(false);
  };

  const renderMessageContent = () => {
    // Strip name prefix from AI messages for display (e.g., "[Jake Turnbull]: message" -> "message")
    // This keeps the names in chat history for AI context but removes them from UI display
    let displayContent = message.content;
    
    // Remove hidden document context from display while keeping it in the stored message for AI
    displayContent = displayContent.replace(/\n\n<!-- DOCUMENT_CONTEXT:\s*\n[\s\S]*?-->/g, '');
    
    if (!isUserMessage && displayContent && message.aiEmployee) {
      // More aggressive name stripping - remove any name prefix that matches the AI's name
      const aiName = message.aiEmployee.name;
      
      // Try multiple patterns in order of specificity
      const patterns = [
        new RegExp(`^\\[${aiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]:\\s*`, 'i'),  // [Exact Name]: 
        new RegExp(`^\\[([^\\]]*${aiName.split(' ')[0]}[^\\]]*)\\]:\\s*`, 'i'),           // [Name with variations]: 
        new RegExp(`^${aiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`, 'i'),        // Exact Name: 
        new RegExp(`^([^:]*${aiName.split(' ')[0]}[^:]*):\\s*`, 'i'),                    // Name variations: 
        /^\[([^\]]+)\]:\s*/,                                                              // Any [Name]: 
      ];
      
      for (const pattern of patterns) {
        const match = displayContent.match(pattern);
        if (match) {
          console.log(`🔍 DEBUG: Stripping name prefix "${match[0]}" from message for ${aiName}`);
          displayContent = displayContent.replace(match[0], '').trim();
          break; // Only apply the first matching pattern
        }
      }
    }
    
    // Use markdown rendering for both AI and user messages
    return (
      <MarkdownRenderer 
        content={displayContent} 
        employees={employees}
      />
    );
  };

  const modelInfo = message.aiEmployee && currentModel ? getModelInfo(currentModel) : null;
  const roleInfo = message.aiEmployee ? getRoleInfo(message.aiEmployee.role) : null;

  // Get custom chat color from synth data
  const getCustomChatColor = () => {
    if (!message.aiEmployee) return null;
    
    // Try to find the synth in employees array first
    const synth = employees.find(emp => emp.id === message.aiEmployee?.id);
    if (synth?.chatColor) return synth.chatColor;
    
    // If not found in employees, try teamMembers array
    const teamMember = teamMembers?.find(member => member.id === message.aiEmployee?.id);
    return teamMember?.chatColor;
  };

  const customChatColor = getCustomChatColor();

  const liveSynth = message.aiEmployee
    ? teamMembers.find(member => member.id === message.aiEmployee?.id) ||
      employees.find(emp => emp.id === message.aiEmployee?.id)
    : undefined;
  const synthAvatar = liveSynth?.profileImage || message.aiEmployee?.profileImage;
  const synthName = liveSynth?.name || message.aiEmployee?.name;

  return (
    <div 
      className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} ${
        hasFollowUp ? 'mb-1' : 'mb-5'
      } ${isDemo ? 'opacity-50' : ''} group`}
    >
      <div className={`flex ${
        isUserMessage
          ? 'max-w-[min(34rem,78%)] flex-row-reverse items-end gap-2'
          : 'flex-col items-start gap-1.5'
      }`}>
        {isUserMessage && (
          <PersonAvatar
            name={userName}
            src={userAvatar}
            className="h-7 w-7 mb-0.5 shrink-0"
          />
        )}
        {!isUserMessage && message.aiEmployee && !isContinuation && (
          <div className="flex items-center">
            <PersonAvatar
              name={synthName}
              src={synthAvatar}
              className="h-7 w-7 mr-2"
            />
            <div className="flex items-center">
              <span className="text-sm font-medium mr-1">{message.aiEmployee.name}</span>
              {roleInfo && (
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1 py-0 h-4 mr-2 ${roleInfo.color}`}
                >
                  {roleInfo.display}
                </Badge>
              )}
              {modelInfo && onUpdateSynthModel && !isDemo && (
                <Popover open={isModelSelectorOpen} onOpenChange={setIsModelSelectorOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      className="text-xs text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 mr-2 cursor-pointer transition-colors underline decoration-dotted underline-offset-2"
                      title="Click to change model"
                    >
                      {modelInfo.display}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Change AI Model for {message.aiEmployee?.name}
                      </p>
                      <Select value={currentModel || message.aiEmployee?.model} onValueChange={handleModelChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <ModelSelectItems currentId={currentModel || message.aiEmployee?.model} />
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {modelInfo && (!onUpdateSynthModel || isDemo) && (
                <span className="text-xs text-neutral-500 mr-2">{modelInfo.display}</span>
              )}
              {message.isLoading && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        )}
        <div className={`flex min-w-0 flex-col ${
          isUserMessage ? 'max-w-full items-end' : 'max-w-[min(42ch,100%)] items-start'
        }`}>
        <div 
          className={`relative w-max max-w-full px-3 py-2 shadow-none ${
            isUserMessage
              ? 'rounded-3xl rounded-tr-none bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white'
              : `${isContinuation ? 'rounded-3xl' : 'rounded-3xl rounded-tl-none'} text-neutral-900 dark:text-neutral-100`
          }`}
          style={
            !isUserMessage && customChatColor
              ? { backgroundColor: customChatColor + '20' }
              : !isUserMessage
              ? { backgroundColor: roleInfo?.bgColor || 'rgb(245 245 245)' }
              : undefined
          }
        >
          {/* Remove button - positioned inside the message box */}
          {onRemoveMessage && !isDemo && !message.isLoading && (
            <button
              onClick={() => onRemoveMessage(message.id)}
              className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm z-10`}
              title="Remove message"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          
          {message.image && (
            <div className="mb-2">
              {message.image._wasStripped || message.image.url === '[Image removed to save storage]' ? (
                <div className="max-w-full h-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 p-4 text-center"
                     style={{ maxHeight: '300px', maxWidth: '300px' }}>
                  <div className="text-neutral-500 dark:text-neutral-400">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs">Image not available</p>
                    <p className="text-xs">(removed to save storage)</p>
                  </div>
                </div>
              ) : (
                <img
                  src={message.image.url}
                  alt={message.image.name}
                  className="max-w-full h-auto rounded-lg border border-neutral-200 dark:border-neutral-700"
                  style={{ maxHeight: '300px', maxWidth: '300px' }}
                />
              )}
              <p className="text-xs mt-1 opacity-75">{message.image.name}</p>
            </div>
          )}
          <div className={isUserMessage ? 'text-base' : ''}>
            {renderMessageContent()}
            {isContinuation && message.isLoading && (
              <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-blue-500" />
            )}
          </div>
        </div>
        {!hasFollowUp && (
          <p className={`mt-1 px-1 text-xs ${
            isUserMessage ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'
          }`}>
            {formattedTime}
          </p>
        )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;