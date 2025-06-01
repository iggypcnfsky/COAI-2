import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onUploadImage?: (file: File) => void;
}

// MessageInput component: Provides the input area for composing messages
const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onUploadImage,
}) => {
  const [message, setMessage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle sending a message
  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  // Handle keyboard shortcut for sending (Ctrl/Cmd + Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Handle image upload button click
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
      
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-end space-x-2">
        {/* Message textarea */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[60px] max-h-[160px] resize-none"
        />
        
        <div className="flex items-center space-x-2">
          {/* Image upload button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleImageButtonClick}
            className="rounded-full h-10 w-10 flex-shrink-0"
          >
            <Image className="h-5 w-5" />
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
            disabled={!message.trim()}
            className="rounded-full h-10 w-10 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-neutral-500 text-right">
        Press Ctrl+Enter to send
      </div>
    </div>
  );
};

export default MessageInput;