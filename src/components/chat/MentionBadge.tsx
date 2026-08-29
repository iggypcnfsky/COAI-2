import React from 'react';
import { AIEmployee } from '@/types';
import { getRoleInfo } from '@/lib/roleColors';
import { PersonAvatar } from '@/components/ui/PersonAvatar';

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
      <PersonAvatar
        name={employee.name}
        src={employee.profileImage}
        className="h-3.5 w-3.5"
        fallbackClassName="text-[7px]"
      />
      <span>@{employee.name}</span>
    </span>
  );
};

export default MentionBadge; 