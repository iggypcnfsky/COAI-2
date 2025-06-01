import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X, Clock, Users } from 'lucide-react';

interface LoadingTeamCardProps {
  onCancel?: () => void;
  prompt?: string;
  className?: string;
}

const LoadingTeamCard: React.FC<LoadingTeamCardProps> = ({
  onCancel,
  prompt = "Generating team...",
  className = ""
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [opacity, setOpacity] = useState(0.6);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const opacityTimer = setInterval(() => {
      setOpacity(prev => {
        const newOpacity = prev === 0.6 ? 1 : 0.6;
        return newOpacity;
      });
    }, 1500); // Gentle pulsing every 1.5 seconds

    return () => clearInterval(opacityTimer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className={`group relative overflow-hidden h-40 transition-all duration-300 ${className}`}
      style={{ opacity }}
    >
      {/* Background gradient with gentle animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-teal-500/20">
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
      </div>
      
      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-between p-3 text-neutral-800 dark:text-white z-20">
        {/* Top section with loading indicator and cancel button */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-green-500" />
            <h3 className="font-medium text-sm leading-tight">
              Generating...
            </h3>
          </div>
          {onCancel && (
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/20 hover:bg-red-500/80 backdrop-blur-sm border-0"
              onClick={onCancel}
              title="Cancel generation"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Center section with team icon and prompt */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-green-500/60" />
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              {prompt}
            </p>
          </div>
        </div>
        
        {/* Bottom section with timer */}
        <div className="flex justify-start">
          <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 bg-black/20 backdrop-blur-md rounded-md px-2 py-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LoadingTeamCard; 