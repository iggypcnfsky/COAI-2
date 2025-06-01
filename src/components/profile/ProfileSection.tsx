import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusCircle, X, Save, Check, Trash2 } from 'lucide-react';
import { AIEmployee, TeamMember } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProfileSectionProps {
  employee: AIEmployee | null;
  teamMember?: TeamMember | null;
  onAddToTeam: (employee: AIEmployee) => void;
  onUpdateTeamMember?: (member: TeamMember, updates: { systemPrompt?: string; model?: string }) => Promise<void>;
  onDeleteSynth?: (synthId: string) => void;
  isCustomSynth?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  employee,
  teamMember,
  onAddToTeam,
  onUpdateTeamMember,
  onDeleteSynth,
  isCustomSynth = false,
  isCollapsed,
  onToggleCollapse,
}) => {
  const isEditingTeamMember = !!teamMember && !employee;
  const displayData = teamMember || employee;
  
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIEmployee['baseModel']>('gpt-4.1-nano');
  const [isUpdateSuccessful, setIsUpdateSuccessful] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (employee) {
      setSystemPrompt(employee.systemPrompt);
      setSelectedModel(employee.baseModel);
    } else if (teamMember) {
      // For team members, use their stored systemPrompt
      setSystemPrompt(teamMember.systemPrompt);
      setSelectedModel(teamMember.model as AIEmployee['baseModel']);
    }
  }, [employee, teamMember]);

  // Reset video state when profile changes
  React.useEffect(() => {
    setVideoLoaded(false);
    setIsImageHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      // Force reload the video source
      videoRef.current.load();
    }
  }, [displayData?.id]);

  const handleAddToTeam = () => {
    if (employee) {
      const updatedEmployee = {
        ...employee,
        systemPrompt,
        baseModel: selectedModel
      };
      onAddToTeam(updatedEmployee);
    }
  };

  const handleUpdateTeamMember = async () => {
    if (teamMember && onUpdateTeamMember) {
      await onUpdateTeamMember(teamMember, {
        systemPrompt,
        model: selectedModel
      });
      
      // Show success feedback
      setIsUpdateSuccessful(true);
      
      // Hide success feedback after 2 seconds
      setTimeout(() => {
        setIsUpdateSuccessful(false);
      }, 2000);
    }
  };

  const handleDeleteSynth = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (employee && onDeleteSynth) {
      onDeleteSynth(employee.id);
      setDeleteDialogOpen(false);
      // Close the profile panel after deletion
      onToggleCollapse();
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleImageMouseEnter = async () => {
    setIsImageHovered(true);
    if (videoRef.current && videoLoaded) {
      try {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
      } catch (error) {
        console.log('Video play failed:', error);
      }
    }
  };

  const handleImageMouseLeave = () => {
    setIsImageHovered(false);
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
  const videoPath = displayData ? `/videos/${displayData.name.toLowerCase()}.mp4` : '';

  if (!displayData) {
    return (
      <div className="hidden md:flex md:flex-col items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
        <p className="text-neutral-500 dark:text-neutral-400">Select an AI employee to view details</p>
      </div>
    );
  }

  return (
    <div className={`h-full bg-neutral-50 dark:bg-neutral-900 md:border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ${
      isCollapsed ? 'w-0 overflow-hidden border-0' : 'w-full'
    }`}>
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
        <h2 className="font-medium text-lg">
          {isEditingTeamMember ? 'Team Member Profile' : 'Profile'}
        </h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex flex-col h-[calc(100%-60px)]">
        <div 
          className="w-full h-[360px] overflow-hidden relative cursor-pointer"
          onMouseEnter={handleImageMouseEnter}
          onMouseLeave={handleImageMouseLeave}
        >
          <img 
            src={displayData.profileImage} 
            alt={displayData.name}
            className="w-full h-full object-cover"
          />
          
          {/* Video overlay - shows on hover */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${isImageHovered && videoLoaded ? 'opacity-100' : 'opacity-0'}`}>
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
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-semibold">{displayData.name}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{displayData.role}</p>
            {employee && <p className="text-sm text-neutral-400 dark:text-neutral-500">{employee.age}</p>}
          </div>

          {/* Action buttons for synths */}
          {employee && !isEditingTeamMember && (
            <div className="mb-4 px-2 space-y-2">
              {isCustomSynth && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSynth}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Custom Synth
                </Button>
              )}
              <Button 
                onClick={handleAddToTeam}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add to Team
              </Button>
            </div>
          )}
          
          <Card className="mb-4 flex-grow flex flex-col">
            <CardContent className="p-4 flex flex-col flex-grow">
              <h4 className="text-sm font-medium mb-2 text-neutral-500">
                {isEditingTeamMember ? 'Custom Prompt' : 'Prompt'}
              </h4>
              <Textarea
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  // Reset success state when user starts editing
                  if (isUpdateSuccessful) {
                    setIsUpdateSuccessful(false);
                  }
                }}
                placeholder={isEditingTeamMember ? "Enter custom prompt for this team member..." : "Enter prompt..."}
                className="flex-grow resize-none"
              />
            </CardContent>
          </Card>
          
          <Card className="mb-4">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2 text-neutral-500">AI Model</h4>
              <Select 
                value={selectedModel} 
                onValueChange={(value) => {
                  setSelectedModel(value as AIEmployee['baseModel']);
                  // Reset success state when user changes model
                  if (isUpdateSuccessful) {
                    setIsUpdateSuccessful(false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                  <SelectItem value="o4-mini">o4 Mini</SelectItem>
                  <SelectItem value="o3">o3</SelectItem>
                  <SelectItem value="o1">o1</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="chatgpt-4o-latest">ChatGPT-4o Latest</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {isEditingTeamMember && (
            <Button 
              onClick={handleUpdateTeamMember}
              className={`w-full text-white transition-all duration-300 ${
                isUpdateSuccessful 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isUpdateSuccessful ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Updated Successfully!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Team Member
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Delete Synth Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Synth</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{employee?.name}"? This action cannot be undone and the synth will be permanently removed from your custom synths.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Synth
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileSection;