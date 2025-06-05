import React, { useState } from 'react';
import { Users, Bot, FileText, Plus, PanelLeftClose, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CustomSynthCard from './CustomSynthCard';
import LoadingSynthCard from './LoadingSynthCard';
import LoadingTeamCard from './LoadingTeamCard';
import CustomTeamCard from './CustomTeamCard';
import FilesSection from './FilesSection';
import CreateSynthModal from './CreateSynthModal';
import EditSynthModal from './EditSynthModal';
import CreateTeamModal, { CustomTeam } from './CreateTeamModal';
import { AIEmployee } from '@/types';
import { generateAISynth, generateAITeam } from '@/lib/api-utils';
import { useAuth } from '@/hooks/store/useAuth';
import { getRandomChatColor } from '@/lib/utils/colors';

interface BrowserPanelProps {
  employees?: AIEmployee[];
  customSynths: AIEmployee[];
  publicSynths?: AIEmployee[];
  onSelectEmployee: (employee: AIEmployee) => void;
  onQuickAdd: (employee: AIEmployee) => void;
  onQuickAddTeam: (employees: AIEmployee[]) => void;
  onSelectTeam: (team: CustomTeam) => void;
  onSelectCustomTeam: (team: CustomTeam) => void;
  onAddNewSynth: (synth: AIEmployee) => void;
  onEditSynth: (synth: AIEmployee) => void;
  onDeleteSynth: (synthId: string) => void;
  onAddNewTeam: (team: CustomTeam) => void;
  customTeams: CustomTeam[];
  publicTeams?: CustomTeam[];
  onToggleCollapse: () => void;
}

const BrowserPanel: React.FC<BrowserPanelProps> = ({
  customSynths = [],
  publicSynths = [],
  onSelectEmployee,
  onQuickAdd,
  onQuickAddTeam,
  onSelectTeam,
  onAddNewSynth,
  onEditSynth,
  onDeleteSynth,
  onAddNewTeam,
  customTeams = [],
  publicTeams = [],
  onToggleCollapse,
}) => {
  // Get auth state from the legacy context (which now uses Zustand)
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('teams');
  const [teamsSubTab, setTeamsSubTab] = useState(user ? 'private' : 'public');
  const [synthsSubTab, setSynthsSubTab] = useState(user ? 'private' : 'public');

  // Update sub-tabs when user authentication state changes
  React.useEffect(() => {
    if (user) {
      // User is logged in, default to private tabs
      setTeamsSubTab('private');
      setSynthsSubTab('private');
    } else {
      // User is not logged in, default to public tabs
      setTeamsSubTab('public');
      setSynthsSubTab('public');
    }
  }, [user]);
  const [isCreateSynthModalOpen, setIsCreateSynthModalOpen] = useState(false);
  const [isEditSynthModalOpen, setIsEditSynthModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [editingSynth, setEditingSynth] = useState<AIEmployee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [synthToDelete, setSynthToDelete] = useState<AIEmployee | null>(null);
  
  // Loading synths state
  interface LoadingSynth {
    id: string;
    keywords: string;
    baseModel: string;
    averageAge: number;
    gender?: string;
    startTime: number;
  }
  const [loadingSynths, setLoadingSynths] = useState<LoadingSynth[]>([]);

  // Loading teams state
  interface LoadingTeam {
    id: string;
    keywords: string;
    teamSize: number;
    includeExistingSynths: boolean;
    teamType: string;
    averageAge: number;
    genderDistribution: { male: number; female: number; nonBinary: number; };
    baseModel: string;
    existingSynths?: any[];
    startTime: number;
  }
  const [loadingTeams, setLoadingTeams] = useState<LoadingTeam[]>([]);

  // Interface for loading synths that are part of teams
  interface LoadingTeamSynth {
    id: string;
    teamId: string;
    name: string;
    role: string;
    profileImage: string; // Placeholder while loading
    startTime: number;
  }
  const [loadingTeamSynths, setLoadingTeamSynths] = useState<LoadingTeamSynth[]>([]);

  // Interface for team generation
  interface GeneratedTeamMember {
    name: string;
    age: number;
    gender?: string;
    role: string;
    systemPrompt: string;
    baseModel: string;
    profileImage: string;
    bio?: string;
    experience?: string[];
    isExisting?: boolean;
    existingId?: string;
    isLoadingImage?: boolean;
  }



  const handleCreateSynth = () => {
    setIsCreateSynthModalOpen(true);
  };

  const handleCreateTeam = () => {
    setIsCreateTeamModalOpen(true);
  };

  const handleSaveSynth = (newSynth: AIEmployee) => {
    onAddNewSynth(newSynth);
    setIsCreateSynthModalOpen(false);
  };



  const handleSaveEditedSynth = (updatedSynth: AIEmployee) => {
    onEditSynth(updatedSynth);
    setIsEditSynthModalOpen(false);
    setEditingSynth(null);
  };

  const handleDeleteSynth = (synthId: string) => {
    const synth = customSynths.find(s => s.id === synthId);
    if (synth) {
      setSynthToDelete(synth);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (synthToDelete) {
      onDeleteSynth(synthToDelete.id);
      setDeleteDialogOpen(false);
      setSynthToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSynthToDelete(null);
  };

  const handleSaveTeam = (newTeam: CustomTeam) => {
    onAddNewTeam(newTeam);
    setIsCreateTeamModalOpen(false);
  };

  const handleQuickAddCustomTeam = (team: CustomTeam) => {
    onQuickAddTeam(team.selectedSynths);
  };

  const handleGenerationStart = (generationData: { keywords: string; baseModel: string; averageAge: number; gender: string; }) => {
    console.log('🚀 Generation started with data:', generationData);
    
    // Generate a timestamp that will be used for both loading and permanent IDs
    const timestamp = Date.now();
    // Use a consistent format that can be parsed in the synth generation function
    const loadingId = `loading-${timestamp}`;
    
    const newLoadingSynth: LoadingSynth = {
      id: loadingId,
      keywords: generationData.keywords,
      baseModel: generationData.baseModel,
      averageAge: generationData.averageAge,
      gender: generationData.gender,
      startTime: timestamp,
    };
    
    console.log('🔄 Adding loading synth:', newLoadingSynth);
    
    setLoadingSynths(prev => {
      const updated = [...prev, newLoadingSynth];
      console.log('📊 Updated loading synths:', updated);
      return updated;
    });
    
    // Switch to synths tab if not already active
    setActiveTab('synths');
    console.log('🔄 Switched to synths tab');
    
    // Start the generation process asynchronously
    console.log('🚀 Starting async generation process');
    generateSynth(newLoadingSynth);
  };

  const generateSynth = async (loadingSynth: LoadingSynth) => {
    console.log('🔄 Starting synth generation for:', loadingSynth.keywords);
    
    try {
      // Step 1: Get synth data quickly (without real image)
      const generatedSynthData = await generateAISynth({
        keywords: loadingSynth.keywords,
        baseModel: loadingSynth.baseModel,
        averageAge: loadingSynth.averageAge,
        gender: loadingSynth.gender,
      });

      console.log('✅ AI Synth data received:', generatedSynthData);

      // Extract timestamp from loading ID to create a permanent ID
      // Format: loading-[timestamp] -> synth-[timestamp]
      const loadingIdParts = loadingSynth.id.split('-');
      const timestamp = loadingIdParts.length > 1 ? loadingIdParts[1] : Date.now().toString();
      const permanentId = `synth-${timestamp}`;
      
      const newSynth: AIEmployee = {
        id: permanentId,
        name: generatedSynthData.name,
        age: generatedSynthData.age,
        gender: generatedSynthData.gender as AIEmployee['gender'],
        role: generatedSynthData.role,
        systemPrompt: generatedSynthData.systemPrompt,
        baseModel: generatedSynthData.baseModel as AIEmployee['baseModel'],
        profileImage: generatedSynthData.profileImage, // This is now a placeholder
        bio: generatedSynthData.bio,
        experience: generatedSynthData.experience,
        chatColor: getRandomChatColor(),
        isLoadingImage: true, // Set to true - useEffect will handle background image generation
      };

      console.log('📝 Created synth object:', newSynth, 'from loading ID:', loadingSynth.id);

      // Remove loading synth first, then add real synth
      setLoadingSynths(prev => {
        console.log('🗑️ Removing loading synth:', loadingSynth.id);
        return prev.filter(ls => ls.id !== loadingSynth.id);
      });
      
      // Add the new synth immediately with placeholder image
      console.log('🔍 [DUPLICATE DEBUG] BrowserPanel calling onAddNewSynth with:', { id: newSynth.id, name: newSynth.name, isLoadingImage: newSynth.isLoadingImage });
      onAddNewSynth(newSynth);
      
      console.log('✅ AI Synth creation completed (fast path) - background image will be generated automatically');
      
    } catch (error) {
      console.error('❌ Error generating AI synth:', error);
      
      // Remove loading synth on error
      setLoadingSynths(prev => {
        console.log('🗑️ Removing loading synth due to error:', loadingSynth.id);
        return prev.filter(ls => ls.id !== loadingSynth.id);
      });
      
      alert(`Failed to generate synth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelGeneration = (loadingId: string) => {
    setLoadingSynths(prev => prev.filter(ls => ls.id !== loadingId));
  };

  const handleTeamGenerationStart = (generationData: { keywords: string; teamSize: number; includeExistingSynths: boolean; teamType: string; averageAge: number; genderDistribution: { male: number; female: number; nonBinary: number; }; baseModel: string; existingSynths?: any[]; }) => {
    console.log('🚀 Team generation started with data:', generationData);
    
    const loadingId = `loading-team-${Date.now()}`;
    const newLoadingTeam: LoadingTeam = {
      id: loadingId,
      keywords: generationData.keywords,
      teamSize: generationData.teamSize,
      includeExistingSynths: generationData.includeExistingSynths,
      teamType: generationData.teamType,
      averageAge: generationData.averageAge,
      genderDistribution: generationData.genderDistribution,
      baseModel: generationData.baseModel,
      existingSynths: generationData.existingSynths,
      startTime: Date.now(),
    };
    
    console.log('🔄 Adding loading team:', newLoadingTeam);
    
    setLoadingTeams(prev => {
      const updated = [...prev, newLoadingTeam];
      console.log('📊 Updated loading teams:', updated);
      return updated;
    });
    
    // Switch to teams tab if not already active
    setActiveTab('teams');
    console.log('🔄 Switched to teams tab');
    
    // Start the generation process asynchronously
    console.log('🚀 Starting async team generation process');
    generateTeam(newLoadingTeam);
  };

  const generateTeam = async (loadingTeam: LoadingTeam) => {
    console.log('🔄 Starting team generation for:', loadingTeam.keywords);
    
    try {
      const generatedTeamData = await generateAITeam({
        keywords: loadingTeam.keywords,
        teamSize: loadingTeam.teamSize,
        useExistingSynths: loadingTeam.includeExistingSynths,
        existingSynths: loadingTeam.existingSynths || [],
        baseModel: loadingTeam.baseModel,
        teamType: loadingTeam.teamType as 'team' | 'group',
        averageAge: loadingTeam.averageAge,
        genderDistribution: loadingTeam.genderDistribution,
      });

      console.log('✅ AI Team data received:', generatedTeamData);

      // Create loading synth cards for team members (all members since images will be generated)
      const teamCreationTimestamp = Date.now();
      const teamId = `ai-team-${teamCreationTimestamp}`;
      
      const newLoadingTeamSynths: LoadingTeamSynth[] = generatedTeamData.members
        .filter((member: GeneratedTeamMember) => !member.isExisting) // Only new members need image generation
        .map((member: GeneratedTeamMember, index: number) => ({
          id: `loading-team-synth-${teamCreationTimestamp}-${index}`,
          teamId: teamId,
          name: member.name,
          role: member.role,
          profileImage: member.profileImage, // Placeholder image
          startTime: teamCreationTimestamp,
        }));
      
      if (newLoadingTeamSynths.length > 0) {
        setLoadingTeamSynths(prev => [...prev, ...newLoadingTeamSynths]);
        console.log('🔄 Added loading team synths:', newLoadingTeamSynths);
      }

      // Convert generated team members to AIEmployee format
      const teamSynths: AIEmployee[] = generatedTeamData.members.map((member: GeneratedTeamMember, index: number) => {
        if (member.isExisting && member.existingId) {
          // Find the existing synth
          const existingSynth = customSynths.find(s => s.id === member.existingId);
          return existingSynth || {
            id: member.existingId,
            name: member.name,
            age: member.age,
            gender: member.gender as AIEmployee['gender'],
            role: member.role,
            systemPrompt: member.systemPrompt,
            baseModel: member.baseModel as AIEmployee['baseModel'],
            profileImage: member.profileImage || '/images/default-avatar.png',
            bio: member.bio,
            experience: member.experience,
          };
        } else {
          // For new synths, we'll need to let the parent component handle ID generation
          // Use a temporary marker that will be replaced when saved to database
          return {
            id: `temp-synth-${Date.now()}-${index}`,
            name: member.name,
            age: member.age,
            gender: member.gender as AIEmployee['gender'],
            role: member.role,
            systemPrompt: member.systemPrompt,
            baseModel: member.baseModel as AIEmployee['baseModel'],
            profileImage: member.profileImage,
            bio: member.bio,
            experience: member.experience,
            chatColor: getRandomChatColor(),
          };
        }
      });

      const newTeam: CustomTeam = {
        id: teamId, // Use the same teamId created above
        name: generatedTeamData.name,
        description: generatedTeamData.description,
        selectedSynths: teamSynths,
        teamImage: generatedTeamData.teamImage,
        originalKeywords: loadingTeam.keywords, // Store the original keywords for image generation
      } as CustomTeam & { originalKeywords: string };

      console.log('📝 Created team object:', newTeam);

      // Remove loading team first, then add real team
      setLoadingTeams(prev => {
        console.log('🗑️ Removing loading team:', loadingTeam.id);
        return prev.filter(lt => lt.id !== loadingTeam.id);
      });
      
      // Clean up loading team synths for this team before adding the real team
      setLoadingTeamSynths(prev => {
        const filtered = prev.filter(lts => lts.teamId !== teamId);
        console.log('🧹 Cleaning up loading team synths for team:', teamId, 'removed:', prev.length - filtered.length);
        return filtered;
      });
      
      // Add the new team
      console.log('➕ Adding new team to parent');
      onAddNewTeam(newTeam);
      
      console.log('✅ AI Team generation completed successfully - images will be generated after Supabase save');
      
    } catch (error) {
      console.error('❌ Error generating AI team:', error);
      
      // Remove loading team on error
      setLoadingTeams(prev => {
        console.log('🗑️ Removing loading team due to error:', loadingTeam.id);
        return prev.filter(lt => lt.id !== loadingTeam.id);
      });
      
      alert(`Failed to generate team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelTeamGeneration = (loadingId: string) => {
    setLoadingTeams(prev => prev.filter(lt => lt.id !== loadingId));
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-3 flex-1">
                <TabsTrigger value="teams" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Teams</span>
                </TabsTrigger>
                <TabsTrigger value="synths" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">Synths</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Files</span>
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="ml-2 h-6 w-6 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                title="Hide browser (⌘+B)"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Sub-tabs for Teams and Synths */}
          {(activeTab === 'teams' || activeTab === 'synths') && (
            <div className="px-3 pb-3">
              <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                {user && (
                  <button
                    onClick={() => activeTab === 'teams' ? setTeamsSubTab('private') : setSynthsSubTab('private')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                      (activeTab === 'teams' ? teamsSubTab : synthsSubTab) === 'private'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    <EyeOff className="h-4 w-4" />
                    <span>Private</span>
                    <span className="text-xs opacity-70">
                      ({activeTab === 'teams' 
                        ? customTeams.length + loadingTeams.length 
                        : customSynths.length + loadingSynths.length + loadingTeamSynths.length
                      })
                    </span>
                  </button>
                )}
                <button
                  onClick={() => activeTab === 'teams' ? setTeamsSubTab('public') : setSynthsSubTab('public')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                    (activeTab === 'teams' ? teamsSubTab : synthsSubTab) === 'public'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>Public</span>
                  <span className="text-xs opacity-70">
                    ({activeTab === 'teams' ? publicTeams.length : publicSynths.length})
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="teams" className="h-full m-0">
            <div className="h-full flex flex-col">
              {/* Teams Header */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex text-xs text-neutral-500 dark:text-neutral-400 items-center gap-1">
                    <span>💡</span>
                    <span>Drag teams to the chat</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleCreateTeam}
                  >
                    <Plus className="h-4 w-4" />
                    Create new team
                  </Button>
                </div>
              </div>
              
              {/* Teams Content */}
              <ScrollArea className="flex-1">
                <div className="p-3">
                  {/* Private Teams */}
                  {teamsSubTab === 'private' && user && (
                    <div>
                      {(customTeams && customTeams.length > 0) || loadingTeams.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {/* Loading teams */}
                          {loadingTeams.map((loadingTeam) => (
                            <LoadingTeamCard
                              key={loadingTeam.id}
                              prompt={`Creating ${loadingTeam.keywords} team...`}
                              onCancel={() => handleCancelTeamGeneration(loadingTeam.id)}
                            />
                          ))}
                          
                          {/* Existing custom teams */}
                          {customTeams.map((team) => (
                            <CustomTeamCard
                              key={team.id}
                              team={team}
                              onClick={onSelectTeam}
                              onQuickAdd={handleQuickAddCustomTeam}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No private teams yet</p>
                          <p className="text-xs mt-1">Create your first team to get started</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Public Teams */}
                  {teamsSubTab === 'public' && (
                    <div>
                      {publicTeams && publicTeams.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {publicTeams.map((team) => (
                            <CustomTeamCard
                              key={team.id}
                              team={team}
                              onClick={onSelectTeam}
                              onQuickAdd={handleQuickAddCustomTeam}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No public teams available</p>
                          <p className="text-xs mt-1">Check back later for community teams</p>
                        </div>
                      )}
                    </div>
                  )}
                  

                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="synths" className="h-full m-0">
            <div className="h-full flex flex-col">
              {/* Synths Header */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex text-xs text-neutral-500 dark:text-neutral-400 items-center gap-1">
                    <span>💡</span>
                    <span>Drag individual synths to the chat</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleCreateSynth}
                  >
                    <Plus className="h-4 w-4" />
                    Create new synth
                  </Button>
                </div>
              </div>
              
              {/* Synths Content */}
              <ScrollArea className="flex-1">
                <div className="p-3">
                  {/* Private Synths */}
                  {synthsSubTab === 'private' && user && (
                    <div>
                      {(customSynths && customSynths.length > 0) || loadingSynths.length > 0 || loadingTeamSynths.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                          {/* Loading synths */}
                          {loadingSynths.map((loadingSynth) => (
                            <LoadingSynthCard
                              key={loadingSynth.id}
                              synthName={`AI Synth`}
                              synthRole={`${loadingSynth.keywords} specialist`}
                              onCancel={() => handleCancelGeneration(loadingSynth.id)}
                            />
                          ))}
                          
                          {/* Loading team synths */}
                          {loadingTeamSynths.map((loadingTeamSynth) => (
                            <LoadingSynthCard
                              key={loadingTeamSynth.id}
                              synthName={loadingTeamSynth.name}
                              synthRole={loadingTeamSynth.role}
                              profileImage={loadingTeamSynth.profileImage}
                              onCancel={() => {
                                setLoadingTeamSynths(prev => prev.filter(lts => lts.id !== loadingTeamSynth.id));
                              }}
                            />
                          ))}
                          
                          {/* Existing custom synths */}
                          {customSynths.map((synth) => (
                            <CustomSynthCard
                              key={synth.id}
                              employee={synth}
                              onClick={onSelectEmployee}
                              onQuickAdd={onQuickAdd}
                              onDelete={handleDeleteSynth}
                              onUpdateSynth={onEditSynth}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                          <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No private synths yet</p>
                          <p className="text-xs mt-1">Create your first synth to get started</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Public Synths */}
                  {synthsSubTab === 'public' && (
                    <div>
                      {publicSynths && publicSynths.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                          {publicSynths.map((synth) => (
                            <CustomSynthCard
                              key={synth.id}
                              employee={synth}
                              onClick={onSelectEmployee}
                              onQuickAdd={onQuickAdd}
                              onDelete={undefined} // Public synths can't be deleted by other users
                              onUpdateSynth={undefined} // Public synths can't be edited by other users
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                          <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No public synths available</p>
                          <p className="text-xs mt-1">Check back later for community synths</p>
                        </div>
                      )}
                    </div>
                  )}
                  

                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="files" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <FilesSection />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {/* Create Synth Modal */}
      <CreateSynthModal
        isOpen={isCreateSynthModalOpen}
        onClose={() => setIsCreateSynthModalOpen(false)}
        onSave={handleSaveSynth}
        onGenerationStart={handleGenerationStart}
      />

      {/* Edit Synth Modal */}
      <EditSynthModal
        isOpen={isEditSynthModalOpen}
        onClose={() => {
          setIsEditSynthModalOpen(false);
          setEditingSynth(null);
        }}
        onSave={handleSaveEditedSynth}
        synth={editingSynth}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSave={handleSaveTeam}
        availableSynths={[]}
        customSynths={customSynths}
        onTeamGenerationStart={handleTeamGenerationStart}
      />

      {/* Delete Synth Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Synth</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{synthToDelete?.name}"? This action cannot be undone and the synth will be permanently removed.
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

export default BrowserPanel;