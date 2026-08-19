import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Clock } from 'lucide-react';
import { PersonAvatar } from '@/components/ui/PersonAvatar';

interface LoadingSynthCardProps {
  synthName?: string;
  synthRole?: string;
  profileImage?: string;
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

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 px-2 py-1.5 rounded-lg ${className}`}>
      <div className="relative shrink-0">
        {profileImage ? (
          <PersonAvatar
            name={synthName}
            src={profileImage}
            className="h-10 w-10 opacity-70"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        )}
        <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate leading-tight">
          {synthName}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
          <span className="truncate">{synthRole}</span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            {formatTime(elapsed)}
          </span>
        </p>
      </div>

      {onCancel && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          onClick={onCancel}
          title="Cancel generation"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default LoadingSynthCard;
