import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Image, Send, Zap, Upload, CornerDownLeft, Command as CommandIcon, AtSign, Space, ArrowUp, ArrowDown } from 'lucide-react';
import { AIEmployee, TeamMember } from '@/types';
import { useMentions } from '@/hooks/useMentions';
import MentionBadge from './MentionBadge';
import FileMentionBadge from './FileMentionBadge';
import { useMessageInput } from '@/hooks/store';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageInputWithMentionsProps {
  onSendMessage: (messageData: { display: string; full: string }, attachedImage?: any) => void;
  onUploadImage?: (file: File) => void;
  onAIContinue?: () => void;
  employees: AIEmployee[];
  teamMembers: TeamMember[];
  isWaitingForStream?: boolean;
  incomingMessageCount?: number;
  globalSpacebarCount?: number;
  onSetDocumentMentionHandler?: (handler: ((doc: Document) => void) | null) => void;
}

// Enhanced message input with mentions support
const MessageInputWithMentions: React.FC<MessageInputWithMentionsProps> = ({
  onSendMessage,
  onAIContinue,
  employees,
  teamMembers,
  isWaitingForStream = false,
  incomingMessageCount = 0,
  globalSpacebarCount = 0,
  onSetDocumentMentionHandler,
}) => {
  console.log('🚨 [COMPONENT MOUNT DEBUG] MessageInputWithMentions mounted with onSetDocumentMentionHandler:', !!onSetDocumentMentionHandler);
  
  // Use message input hook for state management
  const {
    text: message,
    cursorPosition,
    isTriggeringAI,
    attachedImage,
    isDragOver,
    messageHistory,
    historyIndex,
    selectedMentionIndex,
    setText: setMessage,
    setCursorPosition,
    setIsTriggeringAI,
    setAttachedImage,
    setIsDragOver,
    setMessageHistory,
    setHistoryIndex,
    setSelectedMentionIndex
  } = useMessageInput();
  

  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Filter employees to only include current team members
  const teamEmployees = useMemo(() => {
    return employees.filter(employee => 
      teamMembers.some(member => member.id === employee.id)
    );
  }, [employees, teamMembers]);

  const {
    isShowingMentions,
    filteredEmployees,
    checkMentionAtCursor,
    insertMention,
    formatTextWithMentions,
    setIsShowingMentions,
    clearCompletedMentions
  } = useMentions({ employees: teamEmployees });
  
  // Create a display version of the message without document context for the textarea
  const displayMessage = useMemo(() => {
    if (message.includes('<!-- DOCUMENT_CONTEXT:')) {
      // More flexible regex to handle the multi-line format with whitespace
      const afterReplace = message.replace(/\n\n<!-- DOCUMENT_CONTEXT:\s*\n[\s\S]*?-->/g, '');
      return afterReplace;
    }
    
    return message;
  }, [message]);

  // Handle sending a message
  const handleSendMessage = useCallback(() => {
    if (message.trim() || attachedImage) {
      const messageToSend = displayMessage; // Send clean message to chat history
      const fullMessageWithContext = message; // Keep full context for AI processing
      const displayMessageForHistory = displayMessage.trim(); // Use clean version for history
      
      // Add to message history if it's not empty and not the same as the last message
      if (displayMessageForHistory && (messageHistory.length === 0 || messageHistory[messageHistory.length - 1] !== displayMessageForHistory)) {
        setMessageHistory([...messageHistory, displayMessageForHistory]);
      }
      
      // Send clean message to UI, but we need to pass the full context to AI somehow
      // For now, send the clean message - we'll need to modify the AI processing to get context separately
      onSendMessage({ display: messageToSend, full: fullMessageWithContext }, attachedImage);
      setMessage('');
      setAttachedImage(null);
      setCursorPosition(0);
      setHistoryIndex(-1); // Reset history index
      clearCompletedMentions(); // Clear completed mentions for new message
      return true; // Indicate message was sent
    }
    return false; // Indicate message was not sent
  }, [message, attachedImage, displayMessage, messageHistory, setMessage, setAttachedImage, setCursorPosition, setHistoryIndex, setMessageHistory, onSendMessage, clearCompletedMentions]);

  // Reset selected mention index when filtered employees change
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [filteredEmployees, setSelectedMentionIndex]);

  // Reset triggering state when AI processing completes
  useEffect(() => {
    if (!isWaitingForStream && isTriggeringAI) {
      setIsTriggeringAI(false);
      // Refocus the textarea after AI processing completes
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isWaitingForStream, isTriggeringAI, setIsTriggeringAI]);

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    
    // Check if the current message has hidden document context
    const hasDocumentContext = message.includes('<!-- DOCUMENT_CONTEXT:');
    
    if (hasDocumentContext) {
      // Extract the hidden context from the current message
      const contextMatch = message.match(/\n\n<!-- DOCUMENT_CONTEXT:\s*\n[\s\S]*?-->/);
      
      if (contextMatch) {
        const hiddenContext = contextMatch[0];
        
        // The new value is just the visible part, so we need to re-add the hidden context
        const newValueWithContext = newValue + hiddenContext;
        
        setMessage(newValueWithContext);
      } else {
        setMessage(newValue);
      }
    } else {
      setMessage(newValue);
    }
    
    setCursorPosition(newCursorPosition);
    
    // Reset history index when user starts typing
    if (historyIndex !== -1) {
      setHistoryIndex(-1);
    }
    
    // Check if we're typing a mention (use display message for mention detection)
    checkMentionAtCursor(newValue, newCursorPosition);
  };

  // Handle cursor position change
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      const newCursorPosition = textareaRef.current.selectionStart;
      setCursorPosition(newCursorPosition);
      checkMentionAtCursor(displayMessage, newCursorPosition);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Debug handler: Shift+Alt+T creates a test thread
    if (e.shiftKey && e.altKey && e.key === 'T') {
      console.log('🔧 [DEBUG TEST] Creating test thread...');
      
      // Import and use the direct thread creation for testing
      import('../../lib/services/directService').then(({ directService }) => {
        directService.createThread('Test Thread ' + new Date().toLocaleTimeString())
          .then(thread => {
            console.log('🔧 [DEBUG TEST] Test thread created:', thread);
            
            // Set active thread in store
            import('../../stores/appStore').then(({ useAppStore }) => {
              useAppStore.setState(state => ({
                ui: {
                  ...state.ui,
                  activeThreadId: thread.id
                }
              }));
              console.log('🔧 [DEBUG TEST] Active thread set to:', thread.id);
            });
          })
          .catch(error => {
            console.error('🔧 [DEBUG TEST] Error creating test thread:', error);
          });
      });
      
      e.preventDefault();
      return;
    }
    
    // Debug handler: Shift+Alt+M logs the UI state
    if (e.shiftKey && e.altKey && e.key === 'M') {
      import('../../stores/appStore').then(({ useAppStore }) => {
        const state = useAppStore.getState();
        console.log('🔧 [DEBUG TEST] Current UI state:', {
          activeThreadId: state.ui.activeThreadId,
          activeTeamId: state.ui.activeTeamId,
          selectedSynthId: state.ui.selectedSynthId,
          messageInput: state.ui.messageInput,
          threadMessages: state.relationships.threadMessages,
          messages: state.entities.messages,
          threads: state.entities.threads
        });
      });
      e.preventDefault();
      return;
    }

    // Handle spacebar in empty input to trigger AI continuation (but global handler will take precedence)
    if (e.key === ' ' && !message.trim() && onAIContinue && !isWaitingForStream) {
      e.preventDefault();
      
      setIsTriggeringAI(true);
      onAIContinue();
      
      // Visual feedback - brief flash
      if (textareaRef.current) {
        textareaRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.backgroundColor = '';
          }
        }, 200);
      }
      
      return;
    }

    // Enter sends message, Cmd+Enter creates new line
    if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
      if (isShowingMentions) {
        // Select the currently highlighted employee
        if (filteredEmployees.length > 0 && selectedMentionIndex < filteredEmployees.length) {
          handleMentionSelect(filteredEmployees[selectedMentionIndex]);
          e.preventDefault();
          return;
        }
      } else {
        // Send message only if there's content
        const messageSent = handleSendMessage();
        if (messageSent) {
          e.preventDefault();
          return;
        }
        // If message wasn't sent (empty), allow default behavior (new line)
      }
    }

    // Cmd+Enter creates new line (default textarea behavior, no need to handle)

    if (isShowingMentions) {
      if (e.key === 'Escape') {
        setIsShowingMentions(false);
        setSelectedMentionIndex(0);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        setSelectedMentionIndex((prev: number) => 
          prev < filteredEmployees.length - 1 ? prev + 1 : 0
        );
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setSelectedMentionIndex((prev: number) => 
          prev > 0 ? prev - 1 : filteredEmployees.length - 1
        );
        e.preventDefault();
      }
    } else {
      // Handle message history navigation when not showing mentions
      if (e.key === 'ArrowUp' && messageHistory.length > 0) {
        e.preventDefault();
        const newIndex = historyIndex === -1 ? messageHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setMessage(messageHistory[newIndex]);
        
        // Set cursor to end of message
        setTimeout(() => {
          if (textareaRef.current) {
            const length = messageHistory[newIndex].length;
            textareaRef.current.setSelectionRange(length, length);
            setCursorPosition(length);
          }
        }, 0);
      } else if (e.key === 'ArrowDown' && historyIndex !== -1) {
        e.preventDefault();
        if (historyIndex < messageHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setMessage(messageHistory[newIndex]);
          
          // Set cursor to end of message
          setTimeout(() => {
            if (textareaRef.current) {
              const length = messageHistory[newIndex].length;
              textareaRef.current.setSelectionRange(length, length);
              setCursorPosition(length);
            }
          }, 0);
        } else {
          // Go back to empty message
          setHistoryIndex(-1);
          setMessage('');
          setCursorPosition(0);
        }
      }
    }
  };

  // Handle mention selection
  const handleMentionSelect = (employee: AIEmployee) => {
    const result = insertMention(message, employee, cursorPosition);
    
    setMessage(result.text);
    setIsShowingMentions(false);
    setSelectedMentionIndex(0);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(result.cursorPosition, result.cursorPosition);
        setCursorPosition(result.cursorPosition);
      }
    }, 0);
  };

  // Handle image upload
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Process image file (shared between file input and drag/drop)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.error('File is not an image');
      return;
    }
    
    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const imageData = {
        url: base64, // Use base64 as URL for preview
        base64: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
        name: file.name,
        size: file.size,
        type: file.type,
        file: file // Keep original file for upload
      };
      setAttachedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragged items contain files
    const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
    if (hasFiles) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only hide drag over if we're leaving the entire input area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    try {
      // First check if it's a file drop for images
      const files = Array.from(e.dataTransfer.files);
      
      const imageFile = files.find(file => file.type.startsWith('image/'));
      
      if (imageFile) {
        processImageFile(imageFile);
        return;
      }
      
      // Then check if it's a document drop from the browser panel
      const dragData = e.dataTransfer.getData('application/json');
      
      if (dragData) {
        const parsedData = JSON.parse(dragData);
        
        if (parsedData.type === 'document' && parsedData.document) {
          // Handle document drop by inserting mention
          const doc = parsedData.document;
          
          // Add null check to prevent errors
          if (!doc || !doc.title) {
            console.error('Invalid document in drop data:', doc);
            return;
          }
          
          const beforeCursor = message.substring(0, cursorPosition);
          const afterCursor = message.substring(cursorPosition);
          
          // Create a document mention format with hidden content for AI context
          const documentMention = `📄[${doc.title}]`;
          const hiddenContext = `\n\n<!-- DOCUMENT_CONTEXT: 
Document Title: "${doc.title}"
Document ID: ${doc.id}
Content: ${doc.content || 'No content available'}
Created: ${doc.createdAt || 'Unknown'}
Updated: ${doc.updatedAt || 'Unknown'}
-->`;
          
          const newText = `${beforeCursor}${documentMention}${hiddenContext} ${afterCursor}`;
          const newCursorPosition = beforeCursor.length + documentMention.length + hiddenContext.length + 1;
          
          setMessage(newText);
          setCursorPosition(newCursorPosition);
          
          // Focus the textarea and set cursor position
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            }
          }, 0);
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Toggle editing mode to show formatted text
  const handleFocus = () => {
    // Focus handler - no longer need to track editing state
  };

  const handleBlur = () => {
    // Small delay to allow mention selection to work
    setTimeout(() => {
      if (!isShowingMentions) {
        setSelectedMentionIndex(0);
      }
    }, 150);
  };

  // Render the formatted message preview (now shows while editing too)
  const renderFormattedMessage = () => {
    if (!message.trim()) {
      return null;
    }

    // Remove hidden document context from display while keeping mentions visible - USE SAME REGEX AS displayMessage
    const displayMessage = message.replace(/\n\n<!-- DOCUMENT_CONTEXT:\s*\n[\s\S]*?-->/g, '');

    // Parse both employee mentions and file mentions
    const parts: React.ReactNode[] = [];
    const combinedRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$|[^\w])|📄\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(displayMessage)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(displayMessage.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // This is an employee mention
        const mentionName = match[1];
        const employee = teamEmployees.find(emp => 
          emp.name.toLowerCase() === mentionName.toLowerCase()
        );

        if (employee) {
          parts.push(
            <MentionBadge key={`employee-${match.index}-${employee.id}`} employee={employee} />
          );
        } else {
          // If employee not found, just render as text
          parts.push(match[0]);
        }
      } else if (match[2]) {
        // This is a file mention
        const fileName = match[2];
        parts.push(
          <FileMentionBadge key={`file-${match.index}-${fileName}`} title={fileName} />
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < displayMessage.length) {
      parts.push(displayMessage.substring(lastIndex));
    }

    // If no mentions found, use the original formatting logic
    if (parts.length === 0) {
      const originalParts = formatTextWithMentions(displayMessage);
      return (
        <div className="absolute inset-0 pointer-events-none">
          <div className="min-h-[72px] max-h-[192px] overflow-hidden text-sm px-3 py-2">
            {originalParts.map((part, index) => (
              <span key={index}>
                {part.type === 'mention' && part.employee ? (
                  <MentionBadge employee={part.employee} />
                ) : (
                  part.content
                )}
              </span>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div className="min-h-[72px] max-h-[192px] overflow-hidden text-sm px-3 py-2">
          {parts.map((part, index) => (
            <span key={index}>{part}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
      {/* Image attachment preview */}
      {attachedImage && (
        <div className="mb-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start gap-3">
            <img
              src={attachedImage.url}
              alt={attachedImage.name}
              className="w-16 h-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-600"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {attachedImage.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {(attachedImage.size / 1024).toFixed(1)} KB • {attachedImage.type}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                📎 Image will be sent with your message
              </p>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1"
              title="Remove attachment"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="relative">
        {/* Message input with mentions */}
        <div className="relative">
          <Popover open={isShowingMentions} onOpenChange={(open) => {
            // Force close the popover when it tries to close
            if (!open) {
              setIsShowingMentions(false);
              setSelectedMentionIndex(0);
              // Ensure focus returns to textarea
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                }
              }, 0);
            }
          }}>
            <PopoverTrigger asChild>
              <div 
                className="relative"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Textarea
                  ref={textareaRef}
                  value={displayMessage}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onSelect={handleSelectionChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder={isWaitingForStream ? "AI team is continuing the conversation..." : "Type your message... Use @ to mention team members"}
                  className={`min-h-[72px] max-h-[192px] resize-none transition-all duration-200 pr-32 ${
                    displayMessage.trim() ? 'text-transparent' : ''
                  } ${isWaitingForStream ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' : ''} ${
                    isDragOver ? 'border-blue-400 dark:border-blue-500 border-2 border-dashed bg-blue-50/50 dark:bg-blue-950/50' : ''
                  }`}
                />
                {renderFormattedMessage()}
                
                {/* Buttons inside input field */}
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  {/* AI Continue button - only show when input is empty and onAIContinue is available */}
                  {!message.trim() && onAIContinue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!isWaitingForStream) {
                          setIsTriggeringAI(true);
                          onAIContinue();
                        }
                      }}
                      disabled={isTriggeringAI || isWaitingForStream}
                      className={`h-8 w-8 flex-shrink-0 ${
                        isTriggeringAI || isWaitingForStream
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' 
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-blue-600'
                      }`}
                      title="Continue AI conversation (or press Space)"
                    >
                      <Zap className={`h-4 w-4 ${isTriggeringAI || isWaitingForStream ? 'animate-pulse' : ''}`} />
                    </Button>
                  )}
                  
                  {/* Image upload button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleImageButtonClick}
                    className="h-8 w-8 flex-shrink-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    <Image className="h-4 w-4" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </Button>
                  
                  {/* Send button */}
                  <Button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!message.trim() && !attachedImage}
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Drag and drop overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-950/80 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-md z-10">
                    <div className="flex flex-col items-center text-blue-600 dark:text-blue-400">
                      <Upload className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">Drop image here</p>
                    </div>
                  </div>
                )}
              </div>
            </PopoverTrigger>
            
            <PopoverContent 
              className="w-80 p-0" 
              side="top" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandInput 
                  placeholder="Search employees..." 
                  className="h-9"
                  value=""
                  onValueChange={() => {}} // Controlled by our mention logic
                />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  {filteredEmployees.slice(0, 8).map((employee, index) => (
                    <CommandItem
                      key={employee.id}
                      value={employee.name}
                      onSelect={() => handleMentionSelect(employee)}
                      className={`flex items-center gap-2 cursor-pointer ${
                        index === selectedMentionIndex ? 'bg-accent' : ''
                      }`}
                    >
                      <img
                        src={employee.profileImage}
                        alt={employee.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-neutral-500">{employee.role}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Keyboard shortcuts - hidden on mobile */}
      <div className="mt-2 text-xs text-neutral-500 hidden md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              <span>Enter to send</span>
            </div>
            <div className="flex items-center gap-1">
              <CommandIcon className="h-3 w-3" />
              <span>+</span>
              <CornerDownLeft className="h-3 w-3" />
              <span>new line</span>
            </div>
            <div className="flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              <span>mention team</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Space className="h-3 w-3" />
              <span>Space to continue conversation</span>
              {globalSpacebarCount > 0 && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  ({globalSpacebarCount} press{globalSpacebarCount !== 1 ? 'es' : ''})
                </span>
              )}
              {incomingMessageCount > 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  • {incomingMessageCount} incoming
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              <span>navigate message history</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInputWithMentions; 