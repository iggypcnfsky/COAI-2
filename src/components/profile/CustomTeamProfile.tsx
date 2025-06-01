import React from 'react';
import { Users, Plus, X, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomTeam } from '../browser/CreateTeamModal';
import { AIEmployee } from '@/types';

interface CustomTeamProfileProps {
  team: CustomTeam;
  onBack: () => void;
  onAddTeam: (employees: AIEmployee[]) => void;
  onSelectEmployee: (employee: AIEmployee) => void;
  onEditTeam?: (team: CustomTeam) => void;
  onDeleteTeam?: (teamId: string) => void;
}

// Employee card component for custom team profile
const CustomTeamEmployeeCard: React.FC<{
  employee: AIEmployee;
  onClick: (employee: AIEmployee) => void;
  onQuickAdd: (employee: AIEmployee) => void;
}> = ({ employee, onClick, onQuickAdd }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleMouseEnter = async () => {
    setIsHovered(true);
    if (videoRef.current && videoLoaded) {
      try {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
      } catch (error) {
        console.log('Video play failed:', error);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.log('Video failed to load:', e);
    setVideoLoaded(false);
  };

  // Generate video path based on employee name
  const videoPath = `/videos/${employee.name.toLowerCase()}.mp4`;

  return (
    <Card 
      className="group relative overflow-hidden h-48 cursor-pointer transition-all duration-300 hover:shadow-xl"
      onClick={() => onClick(employee)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Full background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${employee.profileImage})` }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
      </div>

      {/* Video element - always present but hidden when not hovered */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${isHovered && videoLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
        >
          <source src={videoPath} type="video/mp4" />
        </video>
        {/* Dark overlay for video as well */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
      
      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-between p-3 text-white z-20">
        {/* Top section with name and action buttons */}
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg leading-tight text-white drop-shadow-lg">
            {employee.name}
          </h3>
          <div className="flex gap-2 relative z-10">
            <Button 
              size="icon" 
              variant="secondary"
              className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(employee);
              }}
              title="Add to team"
            >
              <PlusCircle className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
        
        {/* Bottom section with role and details */}
        <div className="flex flex-col gap-1">
          <span className="inline-block text-xs text-white font-medium px-2 py-1 bg-black/60 backdrop-blur-md rounded-md self-start">
            {employee.role}
          </span>
          <div className="text-xs text-white/80 drop-shadow-md">
            Age {employee.age} • {employee.baseModel}
          </div>
        </div>
      </div>
    </Card>
  );
};

const CustomTeamProfile: React.FC<CustomTeamProfileProps> = ({
  team,
  onBack,
  onAddTeam,
  onSelectEmployee,
  onEditTeam,
  onDeleteTeam,
}) => {
  const handleAddTeam = () => {
    onAddTeam(team.selectedSynths);
  };

  const handleQuickAddEmployee = (employee: AIEmployee) => {
    onAddTeam([employee]);
  };

  const handleEditTeam = () => {
    if (onEditTeam) {
      onEditTeam(team);
    }
  };

  const handleDeleteTeam = () => {
    if (onDeleteTeam && confirm(`Are you sure you want to delete the team "${team.name}"?`)) {
      onDeleteTeam(team.id);
      onBack();
    }
  };

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-900 md:border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {team.selectedSynths.length} members
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onEditTeam && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditTeam}
              className="h-8"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {onDeleteTeam && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDeleteTeam}
              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {/* Large team background image or gradient */}
          <div className="w-full h-[320px] overflow-hidden relative flex-shrink-0">
            {team.teamImage ? (
              <div 
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${team.teamImage})` }}
              >
                <div className="absolute inset-0 bg-black/30" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600">
                <div className="absolute inset-0 bg-black/20" />
              </div>
            )}
            
            {/* Minimal team info overlay - just name and badge */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 text-white">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Custom Team</span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold drop-shadow-lg">
                  {team.name}
                </h2>
              </div>
            </div>
          </div>
          
          {/* Team description section - separated from image */}
          {team.description && (
            <div className="p-6 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {team.description}
              </p>
            </div>
          )}

          {/* Content below image */}
          <div className="p-4 flex flex-col">
            {/* Add Team Button */}
            <Button
              onClick={handleAddTeam}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entire Team to Chat
            </Button>

            {/* Team Members */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                Team Members
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {team.selectedSynths.map((employee) => (
                  <CustomTeamEmployeeCard
                    key={employee.id}
                    employee={employee}
                    onClick={onSelectEmployee}
                    onQuickAdd={handleQuickAddEmployee}
                  />
                ))}
              </div>
            </div>

            {/* Team Composition Insights */}
            <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">
                Team Composition
              </h4>
              <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Team Size:</span>
                  <span className="font-medium">{team.selectedSynths.length} members</span>
                </div>
                <div className="flex justify-between">
                  <span>Specializations:</span>
                  <span className="font-medium">{new Set(team.selectedSynths.map(e => e.role.split(' ')[0])).size} areas</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Models:</span>
                  <span className="font-medium">{new Set(team.selectedSynths.map(e => e.baseModel)).size} different models</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Age:</span>
                  <span className="font-medium">{Math.round(team.selectedSynths.reduce((sum, e) => sum + e.age, 0) / team.selectedSynths.length)} years</span>
                </div>
              </div>
              
              {/* Role breakdown */}
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Roles Distribution
                </h5>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(team.selectedSynths.map(e => e.role))).map((role) => (
                    <span
                      key={role}
                      className="inline-block text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded-full"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CustomTeamProfile; 