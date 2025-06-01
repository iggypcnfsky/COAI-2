import React from 'react';
import { AIEmployee } from '@/types';
import { getRoleInfo } from '@/lib/roleColors';

interface MentionBadgeProps {
  employee: AIEmployee;
  className?: string;
}

const MentionBadge: React.FC<MentionBadgeProps> = ({ employee, className = '' }) => {
  const defaultClasses = 'inline-flex items-center gap-1 px-1 py-0.5 rounded-full text-xs font-medium';
  const backgroundClasses = className || getRoleInfo(employee.role).color;
  
  return (
    <span 
      className={`${defaultClasses} ${backgroundClasses}`}
    >
      <img
        src={employee.profileImage}
        alt={employee.name}
        className="w-3.5 h-3.5 rounded-full object-cover"
      />
      <span>@{employee.name}</span>
    </span>
  );
};

export default MentionBadge; 