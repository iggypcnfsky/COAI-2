import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { TeamMember } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRoleTeamBadgeColor } from '@/lib/roleColors';

interface TeamMembersListProps {
  teamMembers: TeamMember[];
  onRemoveTeamMember: (id: string) => void;
  onAddTeamMember?: (employee: any) => void;
  onSelectTeamMember?: (member: TeamMember) => void;
}

// TeamMembersList component: Displays the current team members in the chat section
const TeamMembersList: React.FC<TeamMembersListProps> = ({
  teamMembers,
  onRemoveTeamMember,
  onSelectTeamMember,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (teamMembers.length === 0) {
    return (
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <div className="p-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-medium hover:bg-transparent mb-2">
                <div className="flex items-center gap-1">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <h3 className="text-xs md:text-sm font-medium">Members (0)</h3>
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-center text-neutral-500">
                <p className="text-sm">
                  No team members yet. Drag and drop employees from the browser or use the + button.
                </p>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-medium hover:bg-transparent">
                <div className="flex items-center gap-1">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <h3 className="text-xs md:text-sm font-medium">
                    Members ({teamMembers.length})
                  </h3>
                </div>
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <ScrollArea className="max-h-[120px]">
              <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                {teamMembers.map((member) => (
                  <TeamMemberBadge
                    key={member.id}
                    member={member}
                    onRemove={onRemoveTeamMember}
                    onSelect={onSelectTeamMember}
                  />
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

// Individual team member badge component
const TeamMemberBadge: React.FC<{
  member: TeamMember;
  onRemove: (id: string) => void;
  onSelect?: (member: TeamMember) => void;
}> = ({ member, onRemove, onSelect }) => {
  // Use custom chat color if available, otherwise fall back to role-based color
  const customStyle = member.chatColor 
    ? { 
        backgroundColor: member.chatColor + '20', // 20% opacity
        borderColor: member.chatColor,
        color: 'inherit'
      }
    : {};
  
  const className = member.chatColor 
    ? 'flex items-center gap-1 border rounded-full pl-1 pr-2 py-1 cursor-pointer transition-colors flex-shrink-0'
    : `flex items-center gap-1 ${getRoleTeamBadgeColor(member.role)} border rounded-full pl-1 pr-2 py-1 cursor-pointer transition-colors flex-shrink-0`;

  return (
    <div 
      className={className}
      style={customStyle}
      onClick={() => onSelect?.(member)}
    >
      <img
        src={member.profileImage}
        alt={member.name}
        className="w-6 h-6 rounded-full object-cover"
      />
      <span className="text-xs font-medium">{member.name}</span>
      <span className="text-xs text-neutral-500">{member.role}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(member.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default TeamMembersList;