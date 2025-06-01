import React from 'react';
import { Plus, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'custom-team',
      team: team,
      employees: team.selectedSynths
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(team);
  };

  return (
    <Card 
      className="group relative overflow-hidden h-40 cursor-pointer transition-all duration-300 hover:shadow-xl"
      onClick={() => onClick(team)}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Background - either custom image or default gradient */}
      {team.teamImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${team.teamImage})` }}
        >
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 group-hover:from-blue-600 group-hover:to-purple-700 transition-colors duration-300">
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}
      
      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-between p-3 text-white z-20">
        {/* Top section with quick add button only */}
        <div className="flex justify-end items-start">
          {/* Quick add button */}
          <Button 
            size="icon" 
            variant="secondary"
            className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
            onClick={handleQuickAdd}
            title="Quick add team"
          >
            <Plus className="h-4 w-4 text-white" />
          </Button>
        </div>
        
        {/* Bottom section with team info */}
        <div className="flex flex-col gap-2">
          {/* Team name and member count */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base leading-tight text-white drop-shadow-lg">
              {team.name}
            </h3>
            <div className="flex items-center gap-1 text-white/80">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {team.selectedSynths.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag indicator */}
      <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none" />
    </Card>
  );
};

export default CustomTeamCard; 