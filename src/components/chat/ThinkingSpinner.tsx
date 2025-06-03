import React from 'react';
import Logo from '../Logo';

interface ThinkingSpinnerProps {
  /** Size of the logo */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

const ThinkingSpinner: React.FC<ThinkingSpinnerProps> = ({ 
  size = 24, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative">
        {/* Logo with shimmer effect */}
        <div className="animate-pulse">
          <Logo 
            size={size} 
            color="#6b7280" 
            className="opacity-80"
          />
        </div>
        
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
      </div>
      
      {/* Thinking text with shimmer */}
      <span className="text-sm text-neutral-500 dark:text-neutral-400 relative overflow-hidden">
        <span className="relative z-10">Thinking...</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slow"></div>
      </span>
    </div>
  );
};

export default ThinkingSpinner; 