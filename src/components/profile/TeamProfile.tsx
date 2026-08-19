import React from 'react';
import { AIEmployee, CustomTeam } from '@/types';
import { Users, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonAvatar, isUsableAvatarUrl } from '@/components/ui/PersonAvatar';
import CustomSynthCard from '../browser/CustomSynthCard';

interface TeamProfileProps {
  team: CustomTeam;
  onBack: () => void;
  onAddTeam: (employees: AIEmployee[]) => void;
  onSelectEmployee: (employee: AIEmployee) => void;
}

const TeamProfile: React.FC<TeamProfileProps> = ({
  team,
  onBack,
  onAddTeam,
  onSelectEmployee,
}) => {
  const members = team.selectedSynths || [];
  const hasGroupImage = isUsableAvatarUrl(team.teamImage);

  const handleAddGroup = () => {
    onAddTeam(members);
  };

  const handleQuickAddEmployee = (employee: AIEmployee) => {
    onAddTeam([employee]);
  };

  return (
    <div className="h-full bg-white dark:bg-neutral-900 md:border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
      <div className="relative flex-shrink-0">
        <div className="h-28 md:h-32 w-full overflow-hidden relative">
          {hasGroupImage ? (
            <img
              src={team.teamImage}
              alt=""
              className="w-full h-full object-cover scale-125 blur-2xl opacity-70"
            />
          ) : (
            <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white dark:to-neutral-900" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-800"
          title="Close profile"
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 md:-bottom-14">
          <div className="h-24 w-36 md:h-28 md:w-40 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-neutral-900 bg-neutral-200 dark:bg-neutral-800 shadow-md">
            {hasGroupImage ? (
              <img
                src={team.teamImage}
                alt={team.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center -space-x-2 bg-neutral-100 dark:bg-neutral-800">
                {members.slice(0, 3).map((member, index) => (
                  <PersonAvatar
                    key={member.id || `${member.name}-${index}`}
                    name={member.name}
                    src={member.profileImage}
                    className="h-10 w-10 ring-2 ring-white dark:ring-neutral-800"
                  />
                ))}
                {members.length === 0 && (
                  <Users className="h-8 w-8 text-neutral-400" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 pt-16 md:pt-[4.25rem]">
        <div className="px-4 pb-3 text-center flex-shrink-0">
          <h2 className="text-xl font-semibold leading-tight">{team.name}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
          {team.description && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
              {team.description}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
            <Button
              size="sm"
              onClick={handleAddGroup}
              className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs px-3"
              title="Add group to current chat"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Chat
            </Button>
          </div>
        </div>

        <div className="px-2 pb-4 flex-1 overflow-y-auto min-h-0">
          <h3 className="px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Members
          </h3>
          {members.length > 0 ? (
            <div className="flex flex-col">
              {members.map((employee) => (
                <CustomSynthCard
                  key={employee.id}
                  employee={employee}
                  onClick={onSelectEmployee}
                  onQuickAdd={handleQuickAddEmployee}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No members yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamProfile;
