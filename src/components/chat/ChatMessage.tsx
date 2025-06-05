import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, AIEmployee, TeamMember } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MarkdownRenderer from './MarkdownRenderer';
import { getRoleInfo } from '@/lib/roleColors';

interface ChatMessageProps {
  message: ChatMessageType;
  isDemo?: boolean;
  employees?: AIEmployee[];
  onRemoveMessage?: (messageId: string) => void;
  onUpdateSynthModel?: (synthId: string, newModel: string) => void;
  teamMembers?: TeamMember[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isDemo = false, 
  employees = [], 
  onRemoveMessage,
  onUpdateSynthModel,
  teamMembers = []
}) => {
  const isUserMessage = message.sender === 'user';
  const formattedTime = format(message.timestamp, 'h:mm a');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  // Get current synth model from team members (live data) instead of message data (historical)
  const getCurrentSynthModel = () => {
    if (!message.aiEmployee) return null;
    
    const currentTeamMember = teamMembers.find(member => member.id === message.aiEmployee?.id);
    return currentTeamMember?.model || message.aiEmployee.model;
  };
  
  const currentModel = getCurrentSynthModel();
  
  const getModelInfo = (model: string) => {
    switch (model) {
      case 'gpt-4.1-nano':
        return { display: 'GPT-4.1 Nano' };
      case 'o4-mini':
        return { display: 'o4 Mini' };
      case 'o3':
        return { display: 'o3' };
      case 'o1':
        return { display: 'o1' };
      case 'gpt-4.1':
        return { display: 'GPT-4.1' };
      case 'gpt-4o':
        return { display: 'GPT-4o' };
      case 'gpt-4o-mini':
        return { display: 'GPT-4o Mini' };
      case 'o3-mini':
        return { display: 'o3 Mini' };
      case 'o1-mini':
        return { display: 'o1 Mini' };
      case 'chatgpt-4o-latest':
        return { display: 'ChatGPT-4o Latest' };
      case 'claude-3-5-sonnet':
        return { display: 'Claude 3.5' };
      case 'claude-4-sonnet':
        return { display: 'Claude 4 Sonnet' };
      case 'claude-4-opus':
        return { display: 'Claude 4 Opus' };
      case 'claude-3-opus':
        return { display: 'Claude 3 Opus' };
      case 'sonar':
        return { display: 'Perplexity Sonar' };
      case 'sonar-pro':
        return { display: 'Perplexity Sonar Pro' };
      case 'sonar-reasoning':
        return { display: 'Perplexity Sonar Reasoning' };
      case 'sonar-reasoning-pro':
        return { display: 'Perplexity Sonar Reasoning Pro' };
      case 'gemini-1.5-pro':
        return { display: 'Gemini 1.5' };
      default:
        return { display: model };
    }
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
                          <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                          <SelectItem value="o4-mini">o4 Mini</SelectItem>
                          <SelectItem value="o3">o3</SelectItem>
                          <SelectItem value="o1">o1</SelectItem>
                          <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="chatgpt-4o-latest">ChatGPT-4o Latest</SelectItem>
                          <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                          <SelectItem value="claude-4-sonnet">Claude 4 Sonnet</SelectItem>
                          <SelectItem value="claude-4-opus">Claude 4 Opus</SelectItem>
                          <SelectItem value="sonar">Perplexity Sonar</SelectItem>
                          <SelectItem value="sonar-pro">Perplexity Sonar Pro</SelectItem>
                          <SelectItem value="sonar-reasoning">Perplexity Sonar Reasoning</SelectItem>
                          <SelectItem value="sonar-reasoning-pro">Perplexity Sonar Reasoning Pro</SelectItem>
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
        
        <div 
          className={`relative rounded-2xl px-5 py-5 shadow-none ${
            isUserMessage
              ? 'bg-transparent border-4 border-neutral-200 text-black dark:text-white ml-4'
              : 'text-neutral-900 dark:text-neutral-100 mr-4'
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