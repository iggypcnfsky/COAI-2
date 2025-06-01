import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X, Clock, User, Sparkles } from 'lucide-react';

interface LoadingSynthCardProps {
  synthName?: string;
  synthRole?: string;
  profileImage?: string; // Placeholder image while loading
  onCancel?: () => void;
  className?: string;
}

const LoadingSynthCard: React.FC<LoadingSynthCardProps> = ({
  synthName = "AI Synth",
  synthRole = "Team Member",
  profileImage,
  onCancel,
  className = ""
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [opacity, setOpacity] = useState(0.7);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const opacityTimer = setInterval(() => {
      setOpacity(prev => {
        const newOpacity = prev === 0.7 ? 1 : 0.7;
        return newOpacity;
      });
    }, 2000); // Gentle pulsing every 2 seconds

    return () => clearInterval(opacityTimer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
      style={{ opacity }}
    >
      {/* Background gradient with gentle animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 to-blue-500/15">
        <div className="absolute inset-0 bg-black/5" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative p-4 text-neutral-800 dark:text-white z-20">
        {/* Top section with cancel button */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              Generating Portrait...
            </span>
          </div>
          {onCancel && (
            <Button
              size="icon"
              variant="secondary"
              className="h-6 w-6 bg-white/20 hover:bg-red-500/80 backdrop-blur-sm border-0"
              onClick={onCancel}
              title="Cancel generation"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Profile section */}
        <div className="flex items-center gap-3 mb-3">
          {/* Profile image or placeholder */}
          <div className="relative">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/30">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={synthName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            {/* Loading indicator overlay */}
            <div className="absolute -top-1 -right-1">
              <Loader2 className="h-4 w-4 animate-spin text-purple-500 bg-white rounded-full p-0.5" />
            </div>
          </div>
          
          {/* Name and role */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">
              {synthName}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
              {synthRole}
            </p>
          </div>
        </div>
        
        {/* Bottom section with timer */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 bg-black/20 backdrop-blur-md rounded-md px-2 py-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(elapsed)}</span>
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            AI Portrait
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LoadingSynthCard; 