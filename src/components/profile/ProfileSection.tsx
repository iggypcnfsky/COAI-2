import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/ui/color-picker';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MessageCircle, X, Save, Check, Trash2, Users } from 'lucide-react';
import { AIEmployee, TeamMember } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelSelectItems } from '@/components/ModelSelect';
import { PersonAvatar, isUsableAvatarUrl } from '@/components/ui/PersonAvatar';
import AddToTeamModal from './AddToTeamModal';
import { useTeams } from '@/hooks/store/useTeams';
import { DEFAULT_MODEL_ID } from '@shared/models';
// Use the Zustand store hooks


interface ProfileSectionProps {
  synth: AIEmployee | null; // Unified: employee = synth
  teamMember?: TeamMember | null;
  onAddToTeam: (synth: AIEmployee) => void;
  onUpdateProfile?: (profile: AIEmployee | TeamMember, updates: { name?: string; role?: string; age?: number; gender?: 'male' | 'female' | 'non-binary' | 'any'; systemPrompt?: string; model?: string; baseModel?: AIEmployee['baseModel']; chatColor?: string }) => Promise<void>;
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
  const [selectedModel, setSelectedModel] = useState<AIEmployee['baseModel']>(DEFAULT_MODEL_ID);
  const [editedName, setEditedName] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedAge, setEditedAge] = useState(25);
  const [editedGender, setEditedGender] = useState<'male' | 'female' | 'non-binary' | 'any'>('any');
  const [editedChatColor, setEditedChatColor] = useState('#3b82f6');
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
      setEditedChatColor(synth.chatColor || '#3b82f6');
    } else if (teamMember) {
      // For team members, use their stored systemPrompt
      setSystemPrompt(teamMember.systemPrompt);
      setSelectedModel(teamMember.model as AIEmployee['baseModel']);
      setEditedName(teamMember.name);
      setEditedRole(teamMember.role);
      
      // Use team member's own chatColor first, then fall back to synth or default
      setEditedChatColor(teamMember.chatColor || (teamMemberSynth?.chatColor) || '#3b82f6');
      
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
        updates.chatColor = editedChatColor;
      } else if (synth) {
        updates.age = editedAge;
        updates.gender = editedGender;
        updates.baseModel = selectedModel;
        updates.chatColor = editedChatColor;
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
  }, [isEditingTeamMember, teamMember, synth, editedName, editedRole, editedAge, editedGender, editedChatColor, systemPrompt, selectedModel]);

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

  const genderLabel = (() => {
    const gender = synth ? synth.gender : (teamMemberSynth ? teamMemberSynth.gender : editedGender);
    if (!gender || gender === 'any') return null;
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  })();

  const fieldClassName = 'h-9 rounded-full';

  return (
    <div className={`h-full bg-white dark:bg-neutral-900 md:border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-0 overflow-hidden border-0' : 'w-full'
    }`}>
      <div className="relative flex-shrink-0">
        <div className="h-28 md:h-32 w-full overflow-hidden relative">
          {isUsableAvatarUrl(displayData.profileImage) ? (
            <img
              src={displayData.profileImage}
              alt=""
              className="w-full h-full object-cover scale-125 blur-2xl opacity-70"
            />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: editedChatColor }} />
          )}
          <div className="absolute inset-0" style={{ backgroundColor: `${editedChatColor}33` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white dark:to-neutral-900" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-800"
          title="Close profile"
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="absolute left-1/2 -translate-x-1/2 -bottom-16 md:-bottom-[4.5rem]">
          <div
            className="relative h-32 w-32 md:h-36 md:w-36 rounded-full cursor-pointer ring-4 ring-white dark:ring-neutral-900"
            style={{ boxShadow: `0 0 0 7px ${editedChatColor}` }}
            onMouseEnter={handleImageMouseEnter}
            onMouseLeave={handleImageMouseLeave}
          >
            <PersonAvatar
              name={displayData.name}
              src={displayData.profileImage}
              alt={displayData.name}
              className="h-full w-full"
              fallbackClassName="text-3xl"
            />
            <div className={`absolute inset-0 rounded-full overflow-hidden transition-opacity duration-300 ${isImageHovered ? 'opacity-100' : 'opacity-0'}`}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover object-top"
                muted
                loop
                playsInline
                preload="metadata"
              >
                <source src={videoPath} type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 pt-[4.75rem] md:pt-20">
        <div className="px-4 pb-3 text-center flex-shrink-0">
          <label htmlFor="synth-profile-name" className="sr-only">Name</label>
          {canEditBasicFields ? (
            <Input
              id="synth-profile-name"
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value);
                if (isUpdateSuccessful) {
                  setIsUpdateSuccessful(false);
                }
              }}
              className="text-xl font-semibold h-auto py-1 text-center border-0 shadow-none bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-neutral-300 dark:focus-visible:border-neutral-600"
              placeholder="Name"
            />
          ) : (
            <h2 className="text-xl font-semibold leading-tight">{displayData.name}</h2>
          )}

          <label htmlFor="synth-profile-role" className="sr-only">Role</label>
          {canEditBasicFields ? (
            <Input
              id="synth-profile-role"
              value={editedRole}
              onChange={(e) => {
                setEditedRole(e.target.value);
                if (isUpdateSuccessful) {
                  setIsUpdateSuccessful(false);
                }
              }}
              className="text-sm text-neutral-500 dark:text-neutral-400 h-auto py-0.5 text-center border-0 shadow-none bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-neutral-300 dark:focus-visible:border-neutral-600"
              placeholder="Role"
            />
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{displayData.role}</p>
          )}

          {(synth || teamMemberSynth) && (
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              {[editedAge, genderLabel].filter(Boolean).join(' · ')}
            </p>
          )}

          {synth?.bio && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
              {synth.bio}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
            {synth && !isEditingTeamMember ? (
              <>
                {onUpdateProfile && (
                  <Button
                    onClick={handleUpdateProfile}
                    size="sm"
                    className={`h-8 rounded-full text-white transition-all duration-300 text-xs px-3 ${
                      isUpdateSuccessful
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    title="Save changes (⌘+Enter)"
                  >
                    {isUpdateSuccessful ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Updated
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Update
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleAddToChat}
                  className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs px-3"
                  title="Add to current chat"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToTeamModal}
                  className="h-8 rounded-full text-xs px-3"
                  title="Add to group"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Group
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSynth}
                  className="h-8 w-8 rounded-full p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  title="Delete synth"
                  aria-label="Delete synth"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : isEditingTeamMember ? (
              <Button
                onClick={handleUpdateProfile}
                size="sm"
                className={`h-8 rounded-full text-white transition-all duration-300 text-xs px-3 ${
                  isUpdateSuccessful
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title="Save changes (⌘+Enter)"
              >
                {isUpdateSuccessful ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Updated
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Update
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col flex-1 overflow-y-auto min-h-0">
          {(synth || teamMemberSynth) && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label htmlFor="synth-profile-age" className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block text-center">Age</label>
                {canEditAllFields ? (
                  <Input
                    id="synth-profile-age"
                    type="number"
                    value={editedAge}
                    onChange={(e) => {
                      setEditedAge(parseInt(e.target.value) || 25);
                      if (isUpdateSuccessful) {
                        setIsUpdateSuccessful(false);
                      }
                    }}
                    className={`${fieldClassName} text-center`}
                    min="18"
                    max="100"
                    placeholder="Age"
                  />
                ) : (
                  <div className={`${fieldClassName} flex items-center justify-center px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm`}>
                    {synth ? synth.age : (teamMemberSynth ? teamMemberSynth.age : editedAge)}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="synth-profile-gender" className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block text-center">Gender</label>
                {canEditAllFields ? (
                  <Select value={editedGender} onValueChange={(value: 'male' | 'female' | 'non-binary' | 'any') => {
                    setEditedGender(value);
                    if (isUpdateSuccessful) {
                      setIsUpdateSuccessful(false);
                    }
                  }}>
                    <SelectTrigger id="synth-profile-gender" className={fieldClassName}>
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`${fieldClassName} flex items-center justify-center px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm`}>
                    {genderLabel || 'Any'}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="synth-profile-model" className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block text-center">Model</label>
                <Select
                  value={selectedModel}
                  onValueChange={(value) => {
                    setSelectedModel(value as AIEmployee['baseModel']);
                    if (isUpdateSuccessful) {
                      setIsUpdateSuccessful(false);
                    }
                  }}
                >
                  <SelectTrigger id="synth-profile-model" className={`${fieldClassName} text-sm`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <ModelSelectItems currentId={selectedModel} />
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!synth && !teamMemberSynth && teamMember && (
            <div className="mb-3">
              <label htmlFor="synth-profile-model" className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">AI Model</label>
              <Select
                value={selectedModel}
                onValueChange={(value) => {
                  setSelectedModel(value as AIEmployee['baseModel']);
                  if (isUpdateSuccessful) {
                    setIsUpdateSuccessful(false);
                  }
                }}
              >
                <SelectTrigger id="synth-profile-model" className={`${fieldClassName} text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ModelSelectItems currentId={selectedModel} />
                </SelectContent>
              </Select>
            </div>
          )}

          {(synth || teamMember) && canEditBasicFields && (
            <div className="mb-3">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Chat Color</label>
              <ColorPicker
                value={editedChatColor}
                onChange={(color) => {
                  setEditedChatColor(color);
                  if (isUpdateSuccessful) {
                    setIsUpdateSuccessful(false);
                  }
                }}
                disabled={!canEditBasicFields}
              />
            </div>
          )}

          <div className="flex-grow flex flex-col min-h-0">
            <h4 className="text-xs font-medium mb-2 text-neutral-500 dark:text-neutral-400">
              {isEditingTeamMember ? 'Custom Prompt' : 'Prompt'}
            </h4>
            <Textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                if (isUpdateSuccessful) {
                  setIsUpdateSuccessful(false);
                }
              }}
              placeholder={isEditingTeamMember ? "Enter custom prompt for this team member..." : "Enter prompt..."}
              className="flex-grow resize-none min-h-[160px] text-sm rounded-2xl"
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