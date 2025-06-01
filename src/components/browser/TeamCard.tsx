import React from 'react';
import { PremadeTeam, getTeamEmployees } from '@/data/premadeTeams';
import { AIEmployee } from '@/types';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TeamCardProps {
  team: PremadeTeam;
  allEmployees: AIEmployee[];
  onClick: (team: PremadeTeam) => void;
  onQuickAdd: (employees: AIEmployee[]) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({
  team,
  allEmployees,
  onClick,
  onQuickAdd,
}) => {
  const teamEmployees = getTeamEmployees(team, allEmployees);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'team',
      team: team,
      employees: teamEmployees
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(teamEmployees);
  };

  return (
    <Card 
      className="group relative overflow-hidden h-40 cursor-pointer transition-all duration-300 hover:shadow-xl"
      onClick={() => onClick(team)}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Full background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${team.backgroundImage})` }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
      </div>
      
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
        
        {/* Bottom section with team name */}
        <div className="flex justify-start items-end">
          {/* Team name in bottom left */}
          <h3 className="font-semibold text-lg leading-tight text-white drop-shadow-lg">
            {team.name}
          </h3>
        </div>
      </div>

      {/* Drag indicator */}
      <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none" />
    </Card>
  );
};

export default TeamCard; 