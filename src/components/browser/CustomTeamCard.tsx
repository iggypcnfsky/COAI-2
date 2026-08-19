import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { CustomTeam } from './CreateTeamModal';

interface CustomTeamCardProps {
  team: CustomTeam;
  onClick: (team: CustomTeam) => void;
  onQuickAdd: (team: CustomTeam) => void;
}

const CustomTeamCard: React.FC<CustomTeamCardProps> = ({
  team,
  onClick,
  onQuickAdd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const members = team.selectedSynths || [];
  const visibleMembers = members.slice(0, 4);
  const extraCount = members.length - visibleMembers.length;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'custom-team',
      team: team,
      employees: team.selectedSynths
    }));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(team);
  };

  return (
    <div
      className={`group flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/70 ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onClick(team)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center shrink-0 pl-0.5">
        {visibleMembers.length > 0 ? (
          <div className="flex -space-x-2">
            {visibleMembers.map((member, index) => (
              <div
                key={member.id || `${member.name}-${index}`}
                className="rounded-full ring-2 ring-white dark:ring-neutral-900"
              >
                <PersonAvatar
                  name={member.name}
                  src={member.profileImage}
                  className="h-9 w-9"
                />
              </div>
            ))}
            {extraCount > 0 && (
              <div className="h-9 w-9 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-200 dark:bg-neutral-700 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                +{extraCount}
              </div>
            )}
          </div>
        ) : (
          <div className="h-9 w-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700">
            {team.teamImage ? (
              <img src={team.teamImage} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate leading-tight">
          {team.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
          {members.length} {members.length === 1 ? 'member' : 'members'}
          {team.description ? (
            <>
              <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">·</span>
              <span>{team.description}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          onClick={handleQuickAdd}
          title="Add group to chat"
        >
          <PlusCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default CustomTeamCard;
