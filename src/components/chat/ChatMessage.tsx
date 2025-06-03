import React from 'react';
import { ChatMessage as ChatMessageType, AIEmployee } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { getRoleInfo } from '@/lib/roleColors';

interface ChatMessageProps {
  message: ChatMessageType;
  isDemo?: boolean;
  employees?: AIEmployee[];
  onRemoveMessage?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isDemo = false, employees = [], onRemoveMessage }) => {
  const isUserMessage = message.sender === 'user';
  const formattedTime = format(message.timestamp, 'h:mm a');
  
  const getModelInfo = (model: string) => {
    switch (model) {
      case 'gpt-4o':
        return {
          display: 'GPT-4o'
        };
      case 'gpt-4o-mini':
        return {
          display: 'GPT-4o Mini'
        };
      case 'o3-mini':
        return {
          display: 'o3 Mini'
        };
      case 'o1':
        return {
          display: 'o1'
        };
      case 'o1-mini':
        return {
          display: 'o1 Mini'
        };
      case 'claude-3-5-sonnet':
        return {
          display: 'Claude 3.5'
        };
      case 'claude-3-opus':
        return {
          display: 'Claude 3 Opus'
        };
      case 'gemini-1.5-pro':
        return {
          display: 'Gemini 1.5'
        };
      default:
        return {
          display: model
        };
    }
  };

  const renderMessageContent = () => {
    // Strip name prefix from AI messages for display (e.g., "[Jake Turnbull]: message" -> "message")
    // This keeps the names in chat history for AI context but removes them from UI display
    let displayContent = message.content;
    
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

  const modelInfo = message.aiEmployee ? getModelInfo(message.aiEmployee.model) : null;
  const roleInfo = message.aiEmployee ? getRoleInfo(message.aiEmployee.role) : null;

  return (
    <div 
      className={`mb-7 ${isUserMessage ? 'flex justify-end' : 'flex justify-start'} ${
        isDemo ? 'opacity-50' : ''
      } group`}
    >
      <div className={`max-w-[65ch] max-w-[40%] ${isUserMessage ? 'order-2' : 'order-1'}`}>
        {!isUserMessage && message.aiEmployee && (
          <div className="flex items-center mb-1.5">
            <img
              src={message.aiEmployee.profileImage}
              alt={message.aiEmployee.name}
              className="w-7 h-7 rounded-full mr-2 object-cover"
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
              {modelInfo && (
                <span className="text-xs text-neutral-500 mr-2">{modelInfo.display}</span>
              )}
              {message.isLoading && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        )}
        
        <div className={`relative rounded-2xl px-5 py-5 ${
          isUserMessage
            ? 'bg-transparent border-4 border-neutral-200 text-black dark:text-white ml-4'
            : `${roleInfo?.bgColor || 'bg-neutral-100 dark:bg-neutral-800'} text-neutral-900 dark:text-neutral-100 mr-4`
        }`}>
          {/* Remove button - positioned inside the message box */}
          {onRemoveMessage && !isDemo && !message.isLoading && (
            <button
              onClick={() => onRemoveMessage(message.id)}
              className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg z-10`}
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
          <div className={isUserMessage ? "text-base" : ""}>{renderMessageContent()}</div>
          <p className={`text-xs mt-1 ${
            isUserMessage ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'
          }`}>
            {formattedTime}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;