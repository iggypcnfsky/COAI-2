import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusCircle, X, Save, Check, Trash2, Users } from 'lucide-react';
import { AIEmployee, TeamMember } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddToTeamModal from './AddToTeamModal';
import { useTeams } from '@/hooks/store/useTeams';
// Use the Zustand store hooks


interface ProfileSectionProps {
  synth: AIEmployee | null; // Unified: employee = synth
  teamMember?: TeamMember | null;
  onAddToTeam: (synth: AIEmployee) => void;
  onUpdateProfile?: (profile: AIEmployee | TeamMember, updates: { name?: string; role?: string; age?: number; gender?: 'male' | 'female' | 'non-binary' | 'any'; systemPrompt?: string; model?: string; baseModel?: AIEmployee['baseModel'] }) => Promise<void>;
  onDeleteSynth?: (synthId: string) => void;
  allSynths?: AIEmployee[]; // All available synths to check team member correspondence
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  synth,
  teamMember,
  onAddToTeam,
  onUpdateProfile,
  onDeleteSynth,
  allSynths = [],
  isCollapsed,
  onToggleCollapse,
}) => {
  // Get auth state from Zustand
  const { addSynthToTeam } = useTeams();
  
  // Use local state for now since we need to properly integrate with Zustand
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIEmployee['baseModel']>('gpt-4o');
  const [editedName, setEditedName] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedAge, setEditedAge] = useState(25);
  const [editedGender, setEditedGender] = useState<'male' | 'female' | 'non-binary' | 'any'>('any');
  const [isUpdateSuccessful, setIsUpdateSuccessful] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [addToTeamModalOpen, setAddToTeamModalOpen] = useState(false);
  
  const isEditingTeamMember = !!teamMember && !synth;
  const displayData = teamMember || synth;
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  // Check if team member corresponds to an actual synth
  const teamMemberSynth = teamMember ? allSynths.find(s => s.id === teamMember.id) : null;
  
  // Unified condition for when we can edit fields
  const canEditAllFields = onUpdateProfile && (synth || teamMemberSynth);
  const canEditBasicFields = onUpdateProfile && (synth || teamMember);

  React.useEffect(() => {
    if (synth) {
      setSystemPrompt(synth.systemPrompt);
      setSelectedModel(synth.baseModel);
      setEditedName(synth.name);
      setEditedRole(synth.role);
      setEditedAge(synth.age);
      setEditedGender(synth.gender || 'any');
    } else if (teamMember) {
      // For team members, use their stored systemPrompt
      setSystemPrompt(teamMember.systemPrompt);
      setSelectedModel(teamMember.model as AIEmployee['baseModel']);
      setEditedName(teamMember.name);
      setEditedRole(teamMember.role);
      
      // If this team member corresponds to an actual synth, use the synth's age/gender
      if (teamMemberSynth) {
        setEditedAge(teamMemberSynth.age);
        setEditedGender(teamMemberSynth.gender || 'any');
      } else {
        setEditedAge(25); // Default age for non-synth team members
        setEditedGender('any'); // Default gender for non-synth team members
      }
    }
  }, [synth, teamMember, teamMemberSynth]);

  // Reset video state when profile changes
  React.useEffect(() => {
    setIsImageHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  }, [displayData?.id]);

  const handleAddToChat = () => {
    if (synth) {
      const updatedSynth = {
        ...synth,
        name: editedName,
        role: editedRole,
        age: editedAge,
        gender: editedGender,
        systemPrompt,
        baseModel: selectedModel
      };
      onAddToTeam(updatedSynth);
    }
  };

  const handleAddToTeamModal = () => {
    setAddToTeamModalOpen(true);
  };

  const handleAddSynthToTeam = async (teamId: string, synthId: string) => {
    try {
              await addSynthToTeam(teamId, synthId, {
          synthId,
          isCustom: true,
          metadata: {
            model: selectedModel,
            systemPrompt: systemPrompt,
            name: editedName,
            role: editedRole,
            age: editedAge,
            gender: editedGender
          }
        });
    } catch (error) {
      console.error('Failed to add synth to team:', error);
      throw error;
    }
  };

  const handleUpdateProfile = async () => {
    const profileToUpdate = teamMember || synth;
    if (profileToUpdate && onUpdateProfile) {
      const updates: any = {
        name: editedName,
        role: editedRole,
        systemPrompt,
      };
      
      // Add model/baseModel based on profile type
      if (teamMember) {
        updates.model = selectedModel;
      } else if (synth) {
        updates.age = editedAge;
        updates.gender = editedGender;
        updates.baseModel = selectedModel;
      }
      
      await onUpdateProfile(profileToUpdate, updates);
      
      // Show success feedback
      setIsUpdateSuccessful(true);
      
      // Hide success feedback after 2 seconds
      setTimeout(() => {
        setIsUpdateSuccessful(false);
      }, 2000);
    }
  };

  // Keyboard shortcut handler for Cmd+Enter
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if ((isEditingTeamMember && teamMember) || synth) {
          handleUpdateProfile();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditingTeamMember, teamMember, synth, editedName, editedRole, editedAge, editedGender, systemPrompt, selectedModel]);

  const handleDeleteSynth = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (synth && onDeleteSynth) {
      onDeleteSynth(synth.id);
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
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        await videoRef.current.play().catch(() => {
          // Silently handle autoplay issues
        });
      } catch (error) {
        // Gracefully handle video play failure
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

  // Generate video path based on synth name
  const videoPath = displayData ? `/videos/${displayData.name.toLowerCase()}.mp4` : '';

  if (!displayData) {
    return (
      <div className="hidden md:flex md:flex-col items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
        <p className="text-neutral-500 dark:text-neutral-400">Select a synth to view details</p>
      </div>
    );
  }

  return (
    <div className={`h-full bg-neutral-50 dark:bg-neutral-900 md:border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-0 overflow-hidden border-0' : 'w-full'
    }`}>
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center gap-2 flex-shrink-0">
        {/* Action buttons for synths */}
        {synth && !isEditingTeamMember ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
            {/* Primary action - Update button for synths */}
            {onUpdateProfile && (
              <Button 
                onClick={handleUpdateProfile}
                size="sm"
                className={`h-7 text-white transition-all duration-300 text-xs ${
                  isUpdateSuccessful 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title="Save changes (⌘+Enter)"
              >
                {isUpdateSuccessful ? (
                  <>
                    <Check className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Updated!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Update</span>
                  </>
                )}
              </Button>
            )}
            
            {/* Secondary actions */}
            <Button 
              size="sm"
              onClick={handleAddToChat}
              className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              title="Add to current chat"
            >
              <PlusCircle className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleAddToTeamModal}
              className="h-7 text-xs"
              title="Add to team"
            >
              <Users className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Team</span>
            </Button>
            
            {/* Destructive action - Delete button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSynth}
              className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 text-xs ml-auto"
              title="Delete synth"
            >
              <Trash2 className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        ) : isEditingTeamMember ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Button 
              onClick={handleUpdateProfile}
              size="sm"
              className={`h-7 text-white transition-all duration-300 text-xs ${
                isUpdateSuccessful 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              title="Save changes (⌘+Enter)"
            >
              {isUpdateSuccessful ? (
                <>
                  <Check className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Updated!</span>
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Update</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        
        {/* Close button - always visible */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className="h-7 w-7 flex-shrink-0"
          title="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex flex-col h-[calc(100%-60px)] overflow-hidden">
        <div 
          className="w-full h-[200px] md:h-[240px] overflow-hidden relative cursor-pointer flex-shrink-0"
          onMouseEnter={handleImageMouseEnter}
          onMouseLeave={handleImageMouseLeave}
        >
          <img 
            src={displayData.profileImage} 
            alt={displayData.name}
            className="w-full h-full object-cover"
          />
          
          {/* Video overlay - shows on hover */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${isImageHovered ? 'opacity-100' : 'opacity-0'}`}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={videoPath} type="video/mp4" />
            </video>
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-grow overflow-y-auto min-h-0">
          {/* Unified Name, role, age and AI model selection */}
          <div className="mb-4 space-y-3">
            {/* Name field - always editable when we can update */}
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Name</label>
              {canEditBasicFields ? (
                <Input
                  value={editedName}
                  onChange={(e) => {
                    setEditedName(e.target.value);
                    if (isUpdateSuccessful) {
                      setIsUpdateSuccessful(false);
                    }
                  }}
                  className="text-lg font-semibold h-8"
                  placeholder="Enter name..."
                />
              ) : (
                <div className="text-lg font-semibold h-8 flex items-center px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
                  {displayData.name}
                </div>
              )}
            </div>
            
            {/* Role field - always editable when we can update */}
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Role</label>
              {canEditBasicFields ? (
                <Input
                  value={editedRole}
                  onChange={(e) => {
                    setEditedRole(e.target.value);
                    if (isUpdateSuccessful) {
                      setIsUpdateSuccessful(false);
                    }
                  }}
                  className="h-8"
                  placeholder="Enter role..."
                />
              ) : (
                <div className="h-8 flex items-center px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
                  {displayData.role}
                </div>
              )}
            </div>

            {/* Age, Gender, and AI Model - combined row for synths and team members who are synths */}
            {(synth || teamMemberSynth) && (
              <div className="grid grid-cols-3 gap-3">
                {/* Age field */}
                <div>
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Age</label>
                  {canEditAllFields ? (
                    <Input
                      type="number"
                      value={editedAge}
                      onChange={(e) => {
                        setEditedAge(parseInt(e.target.value) || 25);
                        if (isUpdateSuccessful) {
                          setIsUpdateSuccessful(false);
                        }
                      }}
                      className="h-8"
                      min="18"
                      max="100"
                      placeholder="Age..."
                    />
                  ) : (
                    <div className="h-8 flex items-center px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm">
                      {synth ? synth.age : (teamMemberSynth ? teamMemberSynth.age : editedAge)}
                    </div>
                  )}
                </div>

                {/* Gender field */}
                <div>
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Gender</label>
                  {canEditAllFields ? (
                    <Select value={editedGender} onValueChange={(value: 'male' | 'female' | 'non-binary' | 'any') => {
                      setEditedGender(value);
                      if (isUpdateSuccessful) {
                        setIsUpdateSuccessful(false);
                      }
                    }}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Gender..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-8 flex items-center px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm">
                      {(() => {
                        const gender = synth ? synth.gender : (teamMemberSynth ? teamMemberSynth.gender : editedGender);
                        return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Any';
                      })()}
                    </div>
                  )}
                </div>

                {/* AI Model field */}
                <div>
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">Model</label>
                  <Select 
                    value={selectedModel} 
                    onValueChange={(value) => {
                      setSelectedModel(value as AIEmployee['baseModel']);
                      if (isUpdateSuccessful) {
                        setIsUpdateSuccessful(false);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                      <SelectItem value="o4-mini">o4 Mini</SelectItem>
                      <SelectItem value="o3">o3</SelectItem>
                      <SelectItem value="o1">o1</SelectItem>
                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="chatgpt-4o-latest">ChatGPT-4o Latest</SelectItem>
                      <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-4-sonnet">Claude 4 Sonnet</SelectItem>
                      <SelectItem value="claude-4-opus">Claude 4 Opus</SelectItem>
                                          <SelectItem value="sonar">Perplexity Sonar</SelectItem>
                    <SelectItem value="sonar-pro">Perplexity Sonar Pro</SelectItem>
                    <SelectItem value="sonar-reasoning">Perplexity Sonar Reasoning</SelectItem>
                    <SelectItem value="sonar-reasoning-pro">Perplexity Sonar Reasoning Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* AI Model selection for team members who are not synths */}
            {!synth && !teamMemberSynth && teamMember && (
              <div>
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">AI Model</label>
                <Select 
                  value={selectedModel} 
                  onValueChange={(value) => {
                    setSelectedModel(value as AIEmployee['baseModel']);
                    if (isUpdateSuccessful) {
                      setIsUpdateSuccessful(false);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                    <SelectItem value="o4-mini">o4 Mini</SelectItem>
                    <SelectItem value="o3">o3</SelectItem>
                    <SelectItem value="o1">o1</SelectItem>
                    <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="chatgpt-4o-latest">ChatGPT-4o Latest</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-4-sonnet">Claude 4 Sonnet</SelectItem>
                    <SelectItem value="claude-4-opus">Claude 4 Opus</SelectItem>
                    <SelectItem value="sonar">Perplexity Sonar</SelectItem>
                    <SelectItem value="sonar-pro">Perplexity Sonar Pro</SelectItem>
                    <SelectItem value="sonar-reasoning">Perplexity Sonar Reasoning</SelectItem>
                    <SelectItem value="sonar-reasoning-pro">Perplexity Sonar Reasoning Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Prompt section - now takes up most of the space */}
          <div className="flex-grow flex flex-col min-h-0">
            <h4 className="text-sm font-medium mb-3 text-neutral-700 dark:text-neutral-300">
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
              className="flex-grow resize-none min-h-[200px] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Delete Synth Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Synth</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{synth?.name}"? This action cannot be undone and the synth will be permanently removed from your synths.
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

      {/* Add to Team Modal */}
      <AddToTeamModal
        isOpen={addToTeamModalOpen}
        onClose={() => setAddToTeamModalOpen(false)}
        synth={synth}
        onAddToTeam={handleAddSynthToTeam}
      />
    </div>
  );
};

export default ProfileSection;