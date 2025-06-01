import React from 'react';
import { FileText } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FileMentionBadgeProps {
  document?: Document;
  title: string;
  className?: string;
}

const FileMentionBadge: React.FC<FileMentionBadgeProps> = ({ document, title, className = '' }) => {
  const defaultClasses = 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium';
  const backgroundClasses = className || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  
  return (
    <span 
      className={`${defaultClasses} ${backgroundClasses}`}
      title={document ? `Document: ${document.title}` : `File: ${title}`}
    >
      <FileText className="w-3 h-3" />
      <span>📄{title}</span>
    </span>
  );
};

export default FileMentionBadge; 