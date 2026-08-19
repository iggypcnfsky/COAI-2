import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, Clock } from 'lucide-react';

interface LoadingTeamCardProps {
  onCancel?: () => void;
  prompt?: string;
  className?: string;
}

const LoadingTeamCard: React.FC<LoadingTeamCardProps> = ({
  onCancel,
  prompt = "Generating group...",
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
      <div className="flex -space-x-2 shrink-0 pl-0.5">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-9 w-9 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-200 dark:bg-neutral-700"
          />
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate leading-tight flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
          Generating group
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
          <span className="truncate">{prompt}</span>
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

export default LoadingTeamCard;
