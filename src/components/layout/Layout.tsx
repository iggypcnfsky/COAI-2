import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Removed duplicate imports - using existing ones below
import Header from './Header';
import BrowserPanel from '../browser/BrowserPanel';
import ProfileSection from '../profile/ProfileSection';
import TeamProfile from '../profile/TeamProfile';
import CustomTeamProfile from '../profile/CustomTeamProfile';
import ChatSection from '../chat/ChatSection';
import EditTeamModal from '../browser/EditTeamModal';
import { AIEmployee, ChatMessage, TeamMember, Team, COAITeam } from '@/types';
import { CustomTeam } from '../browser/CreateTeamModal';
// Legacy imports removed - using directService instead
// Use the Zustand store hooks instead of context
import { useAuth } from '@/hooks/store/useAuth';
// import { useTeamDynamics } from '@/hooks/useTeamDynamics'; // Removed - not using team dynamics
import { useApiKey } from '@/hooks/store/useApiKey';
import { useThreadSynths, useSynths, useTeams } from '@/hooks/store';
import { COAITeamSynthReference, COAISynthData, COAITeamSynth } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';

import { directService } from '@/lib/services/directService';

interface LayoutProps {
  initialMessages: ChatMessage[];
}

const Layout: React.FC<LayoutProps> = ({ initialMessages }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedPremadeTeam, setSelectedPremadeTeam] = useState<COAITeam | null>(null);
  const [selectedCustomTeam, setSelectedCustomTeam] = useState<CustomTeam | null>(null);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(true);
  const [isBrowserCollapsed, setIsBrowserCollapsed] = useState(false);
  const [isWaitingForStream] = useState(false);
  const [globalSpacebarCount, setGlobalSpacebarCount] = useState(0);
  const [lastGlobalSpacebarPress, setLastGlobalSpacebarPress] = useState(0);
  
  // Edit team modal state
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<CustomTeam | null>(null);
  
  // API key context - same interface, but now powered by Zustand
  const { isApiKeyValid } = useApiKey();
  
  // Auth context - same interface, but now powered by Zustand
  const { user } = useAuth();
  
  // Simple state management - no persistence for unauthenticated users
  const [teams, setTeams] = useState<Team[]>([]); // Legacy teams for UI compatibility
  const [messages, setMessagesRaw] = useState<ChatMessage[]>(initialMessages);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Lightweight cache management for thread metadata (just for UI continuity)
  const saveThreadsCache = React.useCallback((teams: Team[]) => {
    if (user) {
      try {
        const cacheData = teams.map(t => ({
          id: t.id,
          name: t.name,
          memberCount: t.members.length,
          lastActivity: t.messages.length > 0 ? t.messages[t.messages.length - 1].timestamp : t.createdAt,
          isActive: t.isActive
        }));
        localStorage.setItem(`coai_threads_cache_${user.id}`, JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to save threads cache:', error);
      }
    }
  }, [user]);
  
  const loadThreadsCache = React.useCallback((): Team[] => {
    if (!user) return [];
    
    try {
      const cached = localStorage.getItem(`coai_threads_cache_${user.id}`);
      if (cached) {
        const cacheData = JSON.parse(cached);
        return cacheData.map((item: any) => ({
          id: item.id,
          name: item.name,
          members: [], // Will be populated when real data loads
          messages: [], // Will be populated when real data loads
                      createdAt: new Date(item.lastActivity || Date.now()),
            isActive: item.isActive || false
        }));
      }
    } catch (error) {
      console.warn('Failed to load threads cache:', error);
    }
    return [];
  }, [user]);
  
  // Load cached threads immediately when user is available
  React.useEffect(() => {
    if (user && teams.length === 0 && !isLoadingData) {
      const cachedTeams = loadThreadsCache();
      if (cachedTeams.length > 0) {
        console.log('📦 Loading cached teams for instant display:', cachedTeams.length);
        setTeams(cachedTeams);
      }
    }
  }, [user, teams.length, isLoadingData, loadThreadsCache]);
  
  // Initialize directService with user when authenticated
  React.useEffect(() => {
    directService.setUser(user?.id || null);
  }, [user?.id]);

  // Simple setMessages - no localStorage, auto-saving handled by separate useEffect
  const setMessages = useCallback((update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesRaw(prevMessages => {
      const newMessages = typeof update === 'function' ? update(prevMessages) : update;
      return newMessages;
    });
  }, []);
  
  // Custom synths - no persistence for unauthenticated users
  const [customSynths, setCustomSynths] = useState<AIEmployee[]>([]);
  
  // No legacy employees - using only custom synths from Supabase
  
  // Get thread-synth actions directly from the store
  const addSynthToThread = useAppStore(state => state.addSynthToThread);
  const removeSynthFromThread = useAppStore(state => state.removeSynthFromThread);
  const getThreadSynths = useAppStore(state => state.getThreadSynths);
  const updateTeamSynthReference = useAppStore(state => state.updateTeamSynthReference);
  const switchThread = useAppStore(state => state.switchThread);
  
  // Function to refetch thread synths
  const refetchThreadSynths = useCallback(() => {
    if (activeThreadId) {
      console.log('🔍 DEBUG: refetchThreadSynths called for thread:', activeThreadId);
      getThreadSynths(activeThreadId);
    } else {
      console.log('🔍 DEBUG: refetchThreadSynths called but no activeThreadId');
    }
  }, [activeThreadId, getThreadSynths]);

  // Thread synths hook - for managing synths in the current thread
  const {
    threadSynths
  } = useThreadSynths();
  
  // Convert store synths directly to team members - no complex adaptation needed
  const threadTeamMembers = useMemo(() => {
    console.log('🔍 DEBUG: Converting threadSynths to teamMembers:', threadSynths.length, 'synths');
    
    return threadSynths.map(synth => {
      // COAISynth has synth_data property with the actual data
      const synthData = synth.synth_data || {};
      console.log('🔍 DEBUG: Processing synth:', synth.id, 'with data:', synthData.name);
      
      return {
        id: synth.id,
        name: synthData.name || 'Unknown',
        role: synthData.role || 'Unknown',
        profileImage: synthData.profileImage || '/default-avatar.png',
        model: synthData.baseModel || 'gpt-4',
        systemPrompt: synthData.systemPrompt || '',
      };
    });
  }, [threadSynths]);

  // Function to get members for any thread from the store
  const getThreadMembersFromStore = useCallback((threadId: string): TeamMember[] => {
    try {
      const currentState = useAppStore.getState();
      const synthEntities = currentState.entities?.synths || {};
      const threadSynthIds = currentState.relationships?.threadSynths?.[threadId] || [];
      
      return threadSynthIds.map(synthId => {
        const synth = synthEntities[synthId];
        if (!synth) return null;
        
        const synthData = synth.synth_data || {};
        return {
          id: synth.id,
          name: synthData.name || 'Unknown',
          role: synthData.role || 'Unknown',
          profileImage: synthData.profileImage || '/default-avatar.png',
          model: synthData.baseModel || 'gpt-4',
          systemPrompt: synthData.systemPrompt || '',
        };
      }).filter(Boolean) as TeamMember[];
    } catch (error) {
      console.warn(`Failed to get members for thread ${threadId}:`, error);
      return [];
    }
  }, []);

  // Synths hook - for managing user's custom synths
  const {
    synths: supabaseCustomSynths,
    createSynth,
    updateSynth,
    deleteSynth
  } = useSynths();

  // Teams hook - for managing user's teams (separate from chat threads)
  const {
    teams: supabaseTeams,
    createTeam: createSupabaseTeam,
    updateTeam: updateSupabaseTeam,
    deleteTeam: deleteSupabaseTeam,
    fetchTeams: refetchSupabaseTeams
  } = useTeams();

  // State to track team synths for all teams
  const [teamSynthsMap, setTeamSynthsMap] = useState<Record<string, COAITeamSynth[]>>({});

  // Load team synths for all teams when supabaseTeams change
  React.useEffect(() => {
    const loadAllTeamSynths = async () => {
      if (!user || supabaseTeams.length === 0) {
        setTeamSynthsMap({});
        return;
      }

      try {
        // Load synths for all teams in parallel
        const teamSynthsPromises = supabaseTeams.map(async (team) => {
          const { data, error } = await supabase
            .from('coai-team-synths')
            .select('*')
            .eq('team_id', team.id)
            .order('created_at', { ascending: true });
          
          if (error) {
            console.error(`Failed to load synths for team ${team.id}:`, error);
            return { teamId: team.id, synths: [] };
          }
          
          return { teamId: team.id, synths: data || [] };
        });

        const teamSynthsResults = await Promise.all(teamSynthsPromises);
        
        // Convert results to map
        const newTeamSynthsMap = teamSynthsResults.reduce((acc, result) => {
          acc[result.teamId] = result.synths;
          return acc;
        }, {} as Record<string, COAITeamSynth[]>);
        
        setTeamSynthsMap(newTeamSynthsMap);
        // Debug logging removed to reduce console noise
      } catch (error) {
        console.error('❌ Failed to load team synths:', error);
      }
    };

    loadAllTeamSynths();
  }, [user, supabaseTeams]);

  // Convert Supabase teams to CustomTeam format for the UI with populated synths
  const customTeams = React.useMemo(() => {
    return supabaseTeams.map(team => {
      const teamSynths = teamSynthsMap[team.id] || [];
      
      // Convert team synths to selectedSynths format
      const selectedSynths = teamSynths.map(teamSynth => {
        const synthRef = teamSynth.synth_reference;
        
        // Try to find the actual synth data
        let synthData: AIEmployee | null = null;
        
        if (synthRef.isCustom) {
          // Look for custom synth
          synthData = customSynths.find(synth => synth.id === synthRef.synthId) || null;
        } else {
          // No built-in employees anymore, use metadata
          synthData = null;
        }
        
        // If we found the synth, use its data; otherwise use metadata
        if (synthData) {
                     return {
             id: synthData.id,
             name: synthData.name,
             role: synthData.role,
             age: synthData.age,
             profileImage: synthData.profileImage,
             bio: synthData.bio,
             experience: synthData.experience,
             systemPrompt: synthRef.metadata?.systemPrompt || synthData.systemPrompt || '',
             baseModel: (synthRef.metadata?.model || synthData.baseModel || 'gpt-4o') as AIEmployee['baseModel']
           } as AIEmployee;
                 } else {
           // Fallback to metadata
           return {
             id: synthRef.synthId,
             name: synthRef.metadata?.name || 'Unknown',
             role: synthRef.metadata?.role || 'Unknown',
             age: 30,
             profileImage: synthRef.metadata?.profileImage || '/default-avatar.png',
             bio: 'Team member',
             experience: ['Professional'],
             systemPrompt: synthRef.metadata?.systemPrompt || '',
             baseModel: (synthRef.metadata?.model || 'gpt-4o') as AIEmployee['baseModel']
           } as AIEmployee;
         }
      });
      
      return {
        id: team.id,
        name: team.team_data.name,
        description: team.team_data.description,
        teamImage: team.team_data.teamImage,
        selectedSynths
      } as CustomTeam;
    });
  }, [supabaseTeams, teamSynthsMap, customSynths]);





  // Convert thread synths to team members for UI - this is the ONLY sync we need
  React.useEffect(() => {
    if (user && activeThreadId) {
      console.log('🔍 DEBUG: Loading thread synths for:', activeThreadId);
      refetchThreadSynths();
    }
  }, [user, activeThreadId, refetchThreadSynths]);

  // Sync the converted team members to UI state
  React.useEffect(() => {
    console.log('🔍 DEBUG: Syncing threadTeamMembers to UI state:', threadTeamMembers.length);
    
    // Simply set the team members from the store conversion
    setTeamMembers(threadTeamMembers);
    
    // Update the active team in teams array, and refresh members for all teams from store
    if (activeThreadId) {
      setTeams(prev => prev.map(team => {
        if (team.id === activeThreadId) {
          // Use the current threadTeamMembers for the active thread
          return { ...team, members: threadTeamMembers };
        } else {
          // Refresh members from store for other threads to ensure they stay populated
          const refreshedMembers = getThreadMembersFromStore(team.id);
          return { ...team, members: refreshedMembers };
        }
      }));
    }
  }, [threadTeamMembers, activeThreadId, getThreadMembersFromStore]);

  // Sync Supabase synths with local state - MERGE instead of replace to prevent duplicates
  React.useEffect(() => {
    console.log('🔍 [DUPLICATE DEBUG] Supabase sync effect triggered');
    console.log('🔍 [DUPLICATE DEBUG] user:', !!user);
    console.log('🔍 [DUPLICATE DEBUG] supabaseCustomSynths length:', supabaseCustomSynths?.length || 0);
    console.log('🔍 [DUPLICATE DEBUG] supabaseCustomSynths IDs:', supabaseCustomSynths?.map(s => s.id) || []);
    
    if (user && supabaseCustomSynths) {
      if (supabaseCustomSynths.length > 0) {
        // Convert COAISynth to AIEmployee format
        const convertedSynths: AIEmployee[] = supabaseCustomSynths.map(synthRow => ({
          id: synthRow.id,
          ...synthRow.synth_data
        }));
        
        console.log('🔍 [DUPLICATE DEBUG] Converted synths from Supabase:', convertedSynths.map(s => ({ id: s.id, name: s.name, isLoadingImage: s.isLoadingImage })));
        
        // MERGE with existing local state to preserve local-only properties like isLoadingImage
        setCustomSynths(prev => {
          console.log('🔍 [DUPLICATE DEBUG] Current local synths before merge:', prev.map(s => ({ id: s.id, name: s.name, isLoadingImage: s.isLoadingImage })));
          
          const existingLocalSynths = new Map(prev.map(synth => [synth.id, synth]));
          const mergedSynths: AIEmployee[] = [];
          
          // Add/update synths from Supabase, preserving local properties
          for (const supabaseSynth of convertedSynths) {
            const existingLocal = existingLocalSynths.get(supabaseSynth.id);
            if (existingLocal) {
              console.log('🔍 [DUPLICATE DEBUG] Merging existing synth:', supabaseSynth.id, 'preserving isLoadingImage:', existingLocal.isLoadingImage);
              // Merge: use Supabase data but preserve local-only properties
              mergedSynths.push({
                ...supabaseSynth,
                isLoadingImage: existingLocal.isLoadingImage, // Preserve loading state
              });
              existingLocalSynths.delete(supabaseSynth.id); // Mark as processed
            } else {
              console.log('🔍 [DUPLICATE DEBUG] Adding new synth from Supabase:', supabaseSynth.id);
              // New synth from Supabase - check if it needs image loading
              const synthWithLoadingState = {
                ...supabaseSynth,
                // If the synth has a placeholder image, mark it as loading
                isLoadingImage: supabaseSynth.profileImage?.includes('placeholder') || supabaseSynth.profileImage?.includes('default') || false
              };
              mergedSynths.push(synthWithLoadingState);
            }
          }
          
          // Add any remaining local-only synths (e.g., ones still being saved)
          for (const localSynth of existingLocalSynths.values()) {
            console.log('🔍 [DUPLICATE DEBUG] Preserving local-only synth:', localSynth.id, 'isLoadingImage:', localSynth.isLoadingImage);
            mergedSynths.push(localSynth);
          }
          
          console.log('🔍 [DUPLICATE DEBUG] Final merged synths:', mergedSynths.map(s => ({ id: s.id, name: s.name, isLoadingImage: s.isLoadingImage })));
          return mergedSynths;
        });
      } else {
        console.log('🔍 [DUPLICATE DEBUG] No synths in Supabase, filtering local synths');
        // User is logged in but has no synths in Supabase
        // Only clear if we don't have any local synths that might be in the process of being saved
        setCustomSynths(prev => {
          const filtered = prev.filter(synth => synth.isLoadingImage || synth.id.startsWith('temp-'));
          console.log('🔍 [DUPLICATE DEBUG] Filtered local synths:', filtered.map(s => ({ id: s.id, name: s.name, isLoadingImage: s.isLoadingImage })));
          return filtered;
        });
      }
    }
  }, [user, supabaseCustomSynths]);

  // Load data when user becomes authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        // Clear data when user logs out
        setTeams([]);
        setActiveThreadId(null);
        setTeamMembers([]);
        setCustomSynths([]);
        setIsLoadingData(false);
        
        // Also clear the Zustand store
        await switchThread(null);
        return;
      }
      
      try {
        setIsLoadingData(true);
        // Debug logging removed to reduce console noise
        
        // Load threads (chat conversations) and active thread
        const [loadedThreads, loadedActiveThreadId] = await Promise.all([
          directService.fetchThreads(),
          directService.getActiveThreadId()
        ]);
        
        // Convert threads to teams for UI compatibility (threads are displayed as "teams" in the chat UI)
        // Load synths for all threads to populate the ChatChip profile pictures
        const threadsAsTeams = await Promise.all(loadedThreads.map(async (thread) => {
          let threadMembers: TeamMember[] = [];
          
          try {
            // Load synths for this thread - this populates the store
            await getThreadSynths(thread.id);
            
            // Get the current store state to access synth entities
            const currentState = useAppStore.getState();
            const synthEntities = currentState.entities?.synths || {};
            const threadSynthIds = currentState.relationships?.threadSynths?.[thread.id] || [];
            
            // Convert thread synths to team members for UI
            threadMembers = threadSynthIds.map(synthId => {
              const synth = synthEntities[synthId];
              if (!synth) return null;
              
              const synthData = synth.synth_data || {};
              return {
                id: synth.id,
                name: synthData.name || 'Unknown',
                role: synthData.role || 'Unknown',
                profileImage: synthData.profileImage || '/default-avatar.png',
                model: synthData.baseModel || 'gpt-4',
                systemPrompt: synthData.systemPrompt || '',
              };
            }).filter(Boolean) as TeamMember[];
          } catch (error) {
            console.warn(`Failed to load synths for thread ${thread.id}:`, error);
            // Keep empty array if loading fails
          }
          
          return {
            id: thread.id,
            name: thread.title,
            members: threadMembers, // Now populated with actual synths
            messages: [], // Will be populated when thread is selected
            createdAt: thread.createdAt,
            isActive: thread.isActive
          };
        }));
        
        // Always update state, but intelligently merge with optimistic updates
        setTeams(prev => {
          // If we have threads that start with 'thread-' (optimistic), preserve them
          const optimisticThreads = prev.filter(t => t.id.startsWith('thread-'));
          if (optimisticThreads.length > 0) {
            console.log('⚠️ Preserving optimistic threads and merging with Supabase data:', optimisticThreads.map(t => t.id));
            // Merge loaded threads with optimistic ones, keeping optimistic ones at the top
            const nonOptimisticLoaded = threadsAsTeams.filter(t => !optimisticThreads.some(opt => opt.id === t.id));
            const finalThreads = [...optimisticThreads, ...nonOptimisticLoaded];
            saveThreadsCache(finalThreads);
            return finalThreads;
          }
          // Debug logging removed to reduce console noise
          saveThreadsCache(threadsAsTeams);
          return threadsAsTeams;
        });
        
        setActiveThreadId(loadedActiveThreadId);
        
        // Also set the active thread in the Zustand store
        if (loadedActiveThreadId) {
          await switchThread(loadedActiveThreadId);
        }
        
        // Load active thread messages if we have an active thread
        if (loadedActiveThreadId) {
          try {
            const threadMessages = await directService.fetchMessages(loadedActiveThreadId);
            const convertedMessages = threadMessages.map(msg => directService.convertMessageDataToChatMessage(msg));
            setMessages(convertedMessages);
            // Debug logging removed to reduce console noise
          } catch (error) {
            console.error('❌ Failed to load thread messages:', error);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load data from directService:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadData();
  }, [user?.id, saveThreadsCache]);

  // Custom teams are now managed by the useTeams hook

  // Validation function for employees/synths
  const validateEmployee = (employee: any): employee is AIEmployee => {
    return employee && 
           typeof employee === 'object' && 
           employee.id && 
           employee.name && 
           employee.role;
  };

  // Natural Team Dynamics - simplified (removed complex dynamics)
  // const isNaturalDynamicsEnabled = false;

  // No persistence for custom synths when user is not authenticated

  // Handler for adding new custom synth
  const handleAddNewSynth = React.useCallback(async (newSynth: AIEmployee) => {
    console.log('🔍 [DUPLICATE DEBUG] handleAddNewSynth called with:', { id: newSynth.id, name: newSynth.name, isLoadingImage: newSynth.isLoadingImage });
    
    let finalSynth = newSynth;
    
    // If user is logged in, persist to Supabase first to get the correct ID
    if (user) {
      console.log('🔍 [DUPLICATE DEBUG] User authenticated, saving to Supabase first');
      try {
        // Convert AIEmployee to COAISynthData format
        const synthData: COAISynthData = {
          name: newSynth.name,
          role: newSynth.role,
          age: newSynth.age,
          profileImage: newSynth.profileImage,
          bio: newSynth.bio,
          experience: newSynth.experience,
          systemPrompt: newSynth.systemPrompt,
          baseModel: newSynth.baseModel,
          metadata: {}
        };
        
        const savedSynth = await createSynth(synthData);
        if (savedSynth) {
          console.log('✅ [DUPLICATE DEBUG] Synth successfully saved to Supabase:', savedSynth.id);
          
          // Create the synth with the Supabase-generated ID
          finalSynth = {
            ...newSynth,
            id: savedSynth.id
          };
          
          console.log('🔍 [DUPLICATE DEBUG] Final synth after Supabase save:', { id: finalSynth.id, name: finalSynth.name, isLoadingImage: finalSynth.isLoadingImage });
          
          // For authenticated users, DON'T add to local state immediately
          // Let the Supabase sync handle it entirely to prevent duplicates
          console.log('🔍 [DUPLICATE DEBUG] Not adding to local state - letting Supabase sync handle it to prevent duplicates');
          // If no image loading needed, let the Supabase sync handle it entirely
        } else {
          console.error('❌ [DUPLICATE DEBUG] Failed to save synth to Supabase - no data returned');
          // Fallback: add to local state anyway
          setCustomSynths(prev => [finalSynth, ...prev]);
        }
      } catch (error) {
        console.error('❌ [DUPLICATE DEBUG] Failed to save synth to Supabase:', error);
        // Fallback: add to local state anyway
        setCustomSynths(prev => [finalSynth, ...prev]);
      }
    } else {
      console.log('🔍 [DUPLICATE DEBUG] User not authenticated, adding to local state immediately');
      // For unauthenticated users, add to local state immediately
      setCustomSynths(prev => [finalSynth, ...prev]);
    }
    
    // Handle background image generation if needed
    if (finalSynth.isLoadingImage) {
      console.log('🎨 Starting background image generation for synth:', finalSynth.name);
      
      // Import the generateSynthImage function dynamically to avoid circular dependencies
      import('@/lib/api-utils').then(({ generateSynthImage }) => {
        generateSynthImage({
          name: finalSynth.name,
          age: finalSynth.age,
          role: finalSynth.role,
          bio: finalSynth.bio,
          systemPrompt: finalSynth.systemPrompt,
          baseModel: finalSynth.baseModel,
          profileImage: finalSynth.profileImage, // Current placeholder
        }).then((realProfileImage) => {
          console.log('✅ [DUPLICATE DEBUG] Background image completed for:', finalSynth.name, 'ID:', finalSynth.id);
          
          // Update the synth with the real image
          const updatedSynth: AIEmployee = {
            ...finalSynth,
            profileImage: realProfileImage,
            isLoadingImage: false,
          };
          
          console.log('🔍 [DUPLICATE DEBUG] Updating synth with real image:', { id: updatedSynth.id, name: updatedSynth.name, isLoadingImage: updatedSynth.isLoadingImage });
          
          // Update in local state
          setCustomSynths(prev => {
            console.log('🔍 [DUPLICATE DEBUG] Current synths before image update:', prev.map(s => ({ id: s.id, name: s.name, isLoadingImage: s.isLoadingImage })));
            const updated = prev.map(synth => synth.id === finalSynth.id ? updatedSynth : synth);
            console.log('🔍 [DUPLICATE DEBUG] Synths after image update:', updated.map(s => ({ id: s.id, name: s.name, isLoadingImage: s.isLoadingImage })));
            return updated;
          });
          
          // Update in Supabase if user is authenticated
          if (user) {
            updateSynth(finalSynth.id, {
              name: updatedSynth.name,
              role: updatedSynth.role,
              age: updatedSynth.age,
              profileImage: realProfileImage,
              bio: updatedSynth.bio,
              experience: updatedSynth.experience,
              systemPrompt: updatedSynth.systemPrompt,
              baseModel: updatedSynth.baseModel,
              metadata: {}
            }).catch(error => console.error('❌ Failed to update synth image in Supabase:', error));
          }
        }).catch((imageError) => {
          console.error('⚠️ Background image generation failed for:', finalSynth.name, imageError);
          
          // Remove loading state even if image generation failed
          const updatedSynth: AIEmployee = {
            ...finalSynth,
            isLoadingImage: false,
          };
          
          setCustomSynths(prev => 
            prev.map(synth => synth.id === finalSynth.id ? updatedSynth : synth)
          );
        });
      }).catch(error => {
        console.error('❌ Failed to import generateSynthImage:', error);
        
        // Remove loading state if import fails
        const updatedSynth: AIEmployee = {
          ...finalSynth,
          isLoadingImage: false,
        };
        
        setCustomSynths(prev => 
          prev.map(synth => synth.id === finalSynth.id ? updatedSynth : synth)
        );
      });
    }
  }, [user, createSynth, updateSynth]);

  // Handler for editing custom synth
  const handleEditSynth = React.useCallback(async (updatedSynth: AIEmployee) => {
    // Update local state first for immediate UI update
    setCustomSynths(prev => 
      prev.map(synth => synth.id === updatedSynth.id ? updatedSynth : synth)
    );
    
    // If user is logged in, also persist to Supabase
    if (user) {
      try {
        // Convert AIEmployee to COAISynthData format
        const synthData: COAISynthData = {
          name: updatedSynth.name,
          role: updatedSynth.role,
          age: updatedSynth.age,
          profileImage: updatedSynth.profileImage,
          bio: updatedSynth.bio,
          experience: updatedSynth.experience,
          systemPrompt: updatedSynth.systemPrompt,
          baseModel: updatedSynth.baseModel,
          metadata: {}
        };
        
        const success = await updateSynth(updatedSynth.id, synthData);
        if (success) {
          console.log('✅ Synth successfully updated in Supabase:', updatedSynth.id);
        } else {
          console.error('❌ Failed to update synth in Supabase');
        }
      } catch (error) {
        console.error('❌ Failed to update synth in Supabase:', error);
        // Keep the local update even if Supabase update fails
      }
    }
  }, [user, updateSynth]);

  // Handler for deleting custom synth
  const handleDeleteSynth = React.useCallback(async (synthId: string) => {
    // Remove from local state first for immediate UI update
    setCustomSynths(prev => prev.filter(synth => synth.id !== synthId));
    
    // Also remove from team members if present
    setTeamMembers(prev => prev.filter(member => member.id !== synthId));
    
    // If user is logged in, also delete from Supabase
    if (user) {
      try {
        await deleteSynth(synthId);
        console.log('✅ Synth successfully deleted from Supabase:', synthId);
      } catch (error) {
        console.error('❌ Failed to delete synth from Supabase:', error);
        // Keep the local deletion even if Supabase deletion fails
      }
    }
  }, [user, deleteSynth, setTeamMembers]);

  // No persistence for custom teams when user is not authenticated

  const handleRemoveTeamMember = React.useCallback(async (id: string) => {
    // Remove from local state first for instant UI feedback
    setTeamMembers(prev => prev.filter(member => member.id !== id));
    
    // Clear selection if removing the selected team member
    if (selectedTeamMember?.id === id) {
      setSelectedTeamMember(null);
      setIsProfileCollapsed(true);
    }
    
    // Update the active team if it exists
    if (activeThreadId) {
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { 
              ...team, 
              members: team.members.filter(member => member.id !== id),
              messages // Keep current messages
            }
          : team
      ));
      
              // Remove from database if user is authenticated
        if (user) {
          try {
            // Check if synth exists in current thread
            const synthExists = threadSynths.some(synth => synth.id === id);
            
            if (synthExists) {
              await removeSynthFromThread(activeThreadId, id);
              console.log('✅ Synth removed from thread in database:', id);
            }
          } catch (error) {
            console.error('❌ Failed to remove synth from thread in database:', error);
          }
        }
    }
  }, [activeThreadId, selectedTeamMember?.id, user, threadSynths, removeSynthFromThread]);

  const handleSelectTeamMember = React.useCallback((member: TeamMember) => {
    setSelectedTeamMember(member);
    setSelectedEmployee(null); // Clear employee selection
    setIsProfileCollapsed(false);
  }, []);

  // No auto-save needed - messages are saved immediately when created

  const handleSelectEmployee = React.useCallback((employee: AIEmployee) => {
    setSelectedEmployee(employee);
    setSelectedTeamMember(null); // Clear team member selection
    setSelectedPremadeTeam(null); // Clear premade team selection
    setSelectedCustomTeam(null); // Clear custom team selection
    setIsProfileCollapsed(false);
  }, []);



  const handleSelectCustomTeam = React.useCallback((team: CustomTeam) => {
    setSelectedCustomTeam(team);
    setSelectedEmployee(null); // Clear employee selection
    setSelectedTeamMember(null); // Clear team member selection
    setSelectedPremadeTeam(null); // Clear premade team selection
    setIsProfileCollapsed(false);
  }, []);

  const handleAddNewTeam = React.useCallback(async (newTeam: CustomTeam) => {
    console.log(`🔍 [ADD TEAM DEBUG] Adding new team: ${newTeam.name}`);
    console.log(`🔍 [ADD TEAM DEBUG] Team has ${newTeam.selectedSynths.length} synths:`, newTeam.selectedSynths.map(s => ({ id: s.id, name: s.name })));
    
    // First, extract any new synths that aren't already in customSynths
    const existingSynthIds = new Set([
      ...customSynths.map(s => s.id)
    ]);

    console.log(`🔍 [ADD TEAM DEBUG] Existing synth IDs:`, Array.from(existingSynthIds));

    // Include synths with temp IDs as new synths
    const newSynths = newTeam.selectedSynths.filter(synth => 
      !existingSynthIds.has(synth.id) || synth.id.startsWith('temp-synth-')
    );

    console.log(`🔍 [ADD TEAM DEBUG] New synths to add:`, newSynths.map(s => ({ id: s.id, name: s.name })));

    // Save new synths and collect their real IDs
    const savedSynthIdMap = new Map<string, string>(); // temp ID -> real ID
    
    if (newSynths.length > 0) {
      console.log(`🆕 Adding ${newSynths.length} new AI-generated synths to global customSynths:`, newSynths.map(s => s.name));
      
      // Save new synths to Supabase if user is authenticated
      if (user) {
        for (const synth of newSynths) {
          try {
            const synthData: COAISynthData = {
              name: synth.name,
              role: synth.role,
              age: synth.age,
              profileImage: synth.profileImage,
              bio: synth.bio,
              experience: synth.experience,
              systemPrompt: synth.systemPrompt,
              baseModel: synth.baseModel,
              metadata: {}
            };
            
            const savedSynth = await createSynth(synthData);
            if (savedSynth && savedSynth.id) {
              savedSynthIdMap.set(synth.id, savedSynth.id);
              console.log('✅ New synth saved to Supabase:', synth.name, 'with ID:', savedSynth.id);
            }
          } catch (error) {
            console.error('❌ Failed to save new synth to Supabase:', error);
          }
        }
      }
      
      if (user) {
        // For authenticated users, DON'T add to local state immediately
        // Let the Supabase sync handle it entirely to prevent duplicates
        console.log('🔍 [ADD TEAM DEBUG] Not adding synths to local state - letting Supabase sync handle it to prevent duplicates');
      } else {
        // For unauthenticated users, add to local state immediately
        const synthsWithRealIds = newSynths.map(synth => ({
          ...synth,
          id: savedSynthIdMap.get(synth.id) || synth.id
        }));
        
        setCustomSynths(prev => {
          const updated = [...synthsWithRealIds, ...prev];
          console.log(`🔍 [ADD TEAM DEBUG] Updated customSynths array now has ${updated.length} synths:`, updated.map(s => ({ id: s.id, name: s.name })));
          return updated;
        });
      }
    } else {
      console.log(`🔍 [ADD TEAM DEBUG] No new synths to add - all already exist`);
    }

    // Save team to Supabase if user is authenticated
    if (user) {
      try {
        console.log('💾 Saving team to Supabase:', newTeam.name);
        
        // Convert CustomTeam to COAITeamData format
        // Store original keywords for later image generation
        const originalKeywords = (newTeam as any).originalKeywords || 'professional team';
        
        const teamData = {
          name: newTeam.name,
          description: newTeam.description || `Team with ${newTeam.selectedSynths.length} members`,
          teamImage: newTeam.teamImage,
          teamType: 'custom' as const,
          metadata: {
            originalId: newTeam.id
          }
        };
        
        // Convert selected synths to synth references using real IDs
        const synthReferences = newTeam.selectedSynths.map(synth => {
          // Use the real ID if we have it, otherwise use the original ID
          const realSynthId = savedSynthIdMap.get(synth.id) || synth.id;
          
          // Check if this is a built-in synth (non-UUID string ID)
          const isBuiltInSynth = /^\d+$/.test(realSynthId) || realSynthId === 'external';
          
          return {
            synthId: realSynthId,
            isCustom: !isBuiltInSynth,
            metadata: {
              model: synth.baseModel,
              systemPrompt: synth.systemPrompt,
              originalMemberId: synth.id,
              name: synth.name,
              role: synth.role,
              profileImage: synth.profileImage
            }
          };
        });

        console.log('🔍 [ADD TEAM DEBUG] Synth references for team:', synthReferences.map(ref => ({ synthId: ref.synthId, isCustom: ref.isCustom, name: ref.metadata.name })));

        // Create team with synths in one operation
        const { createTeamWithSynths } = await import('@/lib/database');
        const savedTeam = await createTeamWithSynths(user.id, teamData, synthReferences);
        
        console.log('✅ Team with synths saved to Supabase successfully:', savedTeam.id);
        
        // Trigger image generation immediately with the saved team data
        console.log('🎨 Starting image generation with real Supabase IDs...');
        import('@/lib/api-utils').then(({ generateTeamImage, generateSynthImage }) => {
          // Generate team image using the saved team data directly
          const teamDataForImage = {
            id: savedTeam.id,
            name: teamData.name,
            description: teamData.description,
            teamType: 'team',
            keywords: originalKeywords,
            members: newSynths // Use the original synth data
          };
          
          console.log('🎨 Generating team image for:', teamData.name, 'with keywords:', originalKeywords);
          generateTeamImage(teamDataForImage).then((teamImageUrl: string) => {
            console.log('✅ Team image generated with real ID:', teamImageUrl.substring(0, 50) + '...');
            // Update via the teams hook
            updateSupabaseTeam(savedTeam.id, {
              name: teamData.name,
              description: teamData.description,
              teamImage: teamImageUrl,
              teamType: 'custom',
              metadata: {}
            });
          }).catch(error => console.error('❌ Team image generation failed:', error));
          
          // Generate synth images for new synths only (not existing ones)
          for (const synth of newSynths) {
            // Use the real ID if we have it, otherwise use the original ID
            const realSynthId = savedSynthIdMap.get(synth.id) || synth.id;
            
            const memberDataForImage = {
              name: synth.name,
              age: synth.age,
              role: synth.role,
              bio: synth.bio || `A ${synth.role}`,
              systemPrompt: synth.systemPrompt,
              baseModel: synth.baseModel,
              profileImage: synth.profileImage,
              keywords: originalKeywords
            };
            
            console.log('🎨 Generating synth image for:', synth.name, 'with keywords:', originalKeywords);
            generateSynthImage(memberDataForImage).then((synthImageUrl: string) => {
              console.log('✅ Synth image generated with real ID:', synth.name, synthImageUrl.substring(0, 50) + '...');
              // Update via the synths hook using the real ID
              updateSynth(realSynthId, {
                name: synth.name,
                role: synth.role,
                age: synth.age,
                profileImage: synthImageUrl,
                bio: synth.bio,
                experience: synth.experience,
                systemPrompt: synth.systemPrompt,
                baseModel: synth.baseModel,
                metadata: {}
              });
            }).catch(error => console.error('❌ Synth image generation failed for', synth.name, ':', error));
          }
        });
        
        // Refetch teams to update the UI
        console.log('🔄 Refetching teams to update UI...');
        refetchSupabaseTeams();
      } catch (error) {
        console.error('❌ Failed to save team to Supabase:', error);
      }
    } else {
      console.log('📝 User not authenticated - team cannot be saved');
    }

    // Update the team with real synth IDs in local state (handled by parent component)
  }, [customSynths, user, createSynth, createSupabaseTeam]);

  const handleEditCustomTeam = React.useCallback((teamToEdit: CustomTeam) => {
    setTeamToEdit(teamToEdit);
    setIsEditTeamModalOpen(true);
  }, []);

  const handleSaveEditedTeam = React.useCallback(async (updatedTeam: CustomTeam) => {
    // Update team in Supabase if user is authenticated
    if (user) {
      try {
        const teamData = {
          name: updatedTeam.name,
          description: updatedTeam.description,
          teamImage: updatedTeam.teamImage,
          teamType: 'custom' as const,
          metadata: {}
        };
        
        await updateSupabaseTeam(updatedTeam.id, teamData);
        console.log('✅ Team updated in Supabase:', updatedTeam.id);
      } catch (error) {
        console.error('❌ Failed to update team in Supabase:', error);
      }
    }
    
    // Update the selected team if it's currently selected
    if (selectedCustomTeam?.id === updatedTeam.id) {
      setSelectedCustomTeam(updatedTeam);
    }
    setIsEditTeamModalOpen(false);
    setTeamToEdit(null);
  }, [selectedCustomTeam?.id, user, updateSupabaseTeam]);

  const handleCloseEditTeamModal = React.useCallback(() => {
    setIsEditTeamModalOpen(false);
    setTeamToEdit(null);
  }, []);

  const handleDeleteCustomTeam = React.useCallback(async (teamId: string) => {
    // Delete team from Supabase if user is authenticated
    if (user) {
      try {
        await deleteSupabaseTeam(teamId);
        console.log('✅ Team deleted from Supabase:', teamId);
      } catch (error) {
        console.error('❌ Failed to delete team from Supabase:', error);
      }
    }
    
    // Clear selection if the deleted team was selected
    if (selectedCustomTeam?.id === teamId) {
      setSelectedCustomTeam(null);
      setIsProfileCollapsed(true);
    }
  }, [selectedCustomTeam?.id, user, deleteSupabaseTeam]);

  const handleAddToThread = React.useCallback(async (employee: AIEmployee) => {
    // Ensure employee has a valid ID
    if (!employee || !employee.id) {
      console.error('❌ Invalid employee object or missing ID:', employee);
      return;
    }

    // Ensure the employee ID is a string, not a stringified object
    let employeeId: string;
    
    // Handle different ID formats
    if (typeof employee.id === 'string') {
      // If it looks like a JSON string, try to parse it
      if (employee.id.startsWith('{') || employee.id.startsWith('[')) {
        try {
          const parsed = JSON.parse(employee.id);
          employeeId = parsed.synthId || parsed.id || employee.id;
          console.log('🔍 Parsed JSON string ID to:', employeeId);
        } catch (e) {
          // If parsing fails, use the original string
          console.log('🔍 Failed to parse JSON string ID, using original:', employee.id);
          employeeId = employee.id;
        }
      } else {
        employeeId = employee.id;
      }
    } else if (employee.id && typeof employee.id === 'object') {
      // Handle case where ID is already an object
      const objId = employee.id as any;
      employeeId = objId.synthId || objId.id || String(employee.id);
      console.log('🔍 Extracted ID from object:', employeeId);
    } else {
      console.error('❌ Could not determine valid employee ID:', employee);
      return;
    }
    
    // Validate that employeeId looks like a UUID if it's supposed to be one
    // UUIDs should have dashes in specific positions
    if (employeeId.includes('-') && !employeeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('❌ Invalid UUID format:', employeeId);
      // Try to clean up the ID - remove quotes, braces, etc.
      employeeId = employeeId.replace(/['"{}]/g, '');
      console.log('🔍 Cleaned up ID:', employeeId);
    }
    
    const newTeamMember: TeamMember = {
      id: employeeId,
      name: employee.name || 'Unknown Name',
      role: employee.role || 'Unknown Role',
      profileImage: employee.profileImage || '/default-avatar.png',
      model: employee.baseModel || 'gpt-4',
      systemPrompt: employee.systemPrompt || '',
    };

    // Add to local team members state for UI
    setTeamMembers(prev => {
      if (prev.some(member => member.id === employeeId)) return prev;
      return [...prev, newTeamMember];
    });

    // If no active thread exists, automatically create a new thread
    if (!activeThreadId) {
      console.log('DEBUG - Creating new thread for synth:', employee.name);
      
      // Create a proper thread in the database if user is authenticated
      if (user) {
        try {
          const newThread = await directService.createThread(`Chat with ${employee.name}`);
          console.log('DEBUG - Created new thread:', newThread);
          setActiveThreadId(newThread.id);
          setMessages([]); // Clear messages when creating new thread
          
          // Update teams list with the new thread
          const newTeam: Team = {
            id: newThread.id,
            name: `Chat with ${employee.name}`,
            members: [newTeamMember],
            messages: [],
            createdAt: new Date(),
            isActive: true
          };
          setTeams(prev => [...prev, newTeam]);
          
          // Set active thread in Zustand store
          await switchThread(newThread.id);
          
          // Add the synth to the new thread
          const isCustomSynth = customSynths.some(synth => synth.id === employeeId);
          const synthReference: COAITeamSynthReference = {
            synthId: employeeId,
            isCustom: isCustomSynth,
            metadata: {
              model: employee.baseModel || 'gpt-4',
              systemPrompt: employee.systemPrompt || '',
              originalMemberId: employeeId,
              name: employee.name,
              role: employee.role,
              profileImage: employee.profileImage
            }
          };
          
          await addSynthToThread(newThread.id, employeeId, synthReference);
          console.log('✅ Synth added to new thread:', employee.name);
        } catch (error) {
          console.error('❌ Failed to create thread or add synth:', error);
          // Fallback to local state only
          const newTeam: Team = {
            id: crypto.randomUUID(), // Use proper UUID format
            name: `Chat with ${employee.name}`,
            members: [newTeamMember],
            messages: [],
            createdAt: new Date(),
            isActive: true
          };
          
          setTeams(prev => [...prev, newTeam]);
          setActiveThreadId(newTeam.id);
          setMessages([]);
        }
      } else {
        // User not authenticated, use local state only
        const newTeam: Team = {
          id: crypto.randomUUID(), // Use proper UUID format
          name: `Chat with ${employee.name}`,
          members: [newTeamMember],
          messages: [],
          createdAt: new Date(),
          isActive: true
        };
        
        setTeams(prev => [...prev, newTeam]);
        setActiveThreadId(newTeam.id);
        setMessages([]);
      }
    } else {
      // Update the active team if it exists (for UI continuity)
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { 
              ...team, 
              members: team.members.some(m => m.id === employeeId) 
                ? team.members 
                : [...team.members, newTeamMember],
              messages // Keep current messages
            }
          : team
      ));
      
      // Persist to database if user is authenticated
      if (user && activeThreadId) {
        try {
                    // First, verify the thread exists in the database
          let threadIdToUse = activeThreadId;
          const threadExists = await directService.getThread(activeThreadId);
          if (!threadExists) {
            console.error('❌ Thread does not exist in database:', activeThreadId);
            // Try to create the thread if it doesn't exist
            try {
              const currentTeam = teams.find(t => t.id === activeThreadId);
              const threadTitle = currentTeam?.name || 'New Chat';
              const newThread = await directService.createThread(threadTitle);
              
              // Update the activeThreadId to the new thread
              setActiveThreadId(newThread.id);
              threadIdToUse = newThread.id;
              
              // Update teams list
              setTeams(prev => prev.map(team => 
                team.id === activeThreadId 
                  ? { ...team, id: newThread.id }
                  : team
              ));
              
              // Update Zustand store
              await switchThread(newThread.id);
              
              console.log('✅ Created missing thread:', newThread.id);
            } catch (createError) {
              console.error('❌ Failed to create missing thread:', createError);
              return; // Exit early if we can't create the thread
            }
          }
          
          // Determine if this is a custom synth or built-in
          const isCustomSynth = customSynths.some(synth => synth.id === employeeId);
          
          // Create a proper synth reference object
          const synthReference: COAITeamSynthReference = {
            synthId: employeeId,
            isCustom: isCustomSynth,
            metadata: {
              model: employee.baseModel || 'gpt-4',
              systemPrompt: employee.systemPrompt || '',
              originalMemberId: employeeId,
              name: employee.name,
              role: employee.role,
              profileImage: employee.profileImage
            }
          };
          
          console.log('🔍 Adding synth to thread with ID:', employeeId, 'isCustom:', isCustomSynth);

          // If this is a custom synth with updated prompt/model, also update the synth data
          if (isCustomSynth) {
            const existingCustomSynth = customSynths.find(synth => synth.id === employeeId);
            if (existingCustomSynth && 
                (existingCustomSynth.systemPrompt !== employee.systemPrompt || 
                 existingCustomSynth.baseModel !== employee.baseModel)) {
              
              const updatedSynthData: Partial<COAISynthData> = {
                ...existingCustomSynth,
                systemPrompt: employee.systemPrompt,
                baseModel: employee.baseModel
              };
              
              try {
                await updateSynth(employeeId, updatedSynthData);
                console.log('✅ Custom synth updated with new prompt/model before adding to thread:', employeeId);
              } catch (updateError) {
                console.error('❌ Error updating custom synth with new prompt/model:', updateError);
              }
            }
          }
          
          // Use addSynthToThread instead of addSynthToTeam for threads
          await addSynthToThread(threadIdToUse, employeeId, synthReference);
          console.log('✅ Synth added to thread in database:', employee.name);
          
          // Immediately refetch thread synths to update the store
          console.log('🔄 Refetching thread synths after adding single synth');
          refetchThreadSynths();
        } catch (error) {
          console.error('❌ Failed to add synth to thread in database:', error);
        }
      }
    }
  }, [activeThreadId, teams.length, setTeams, setActiveThreadId, setMessages, setTeamMembers, user, customSynths, addSynthToThread, updateSynth]);

  const handleQuickAddToThread = React.useCallback(async (synths: AIEmployee[]) => {
    // Validate that synths is an array and filter out invalid entries
    if (!Array.isArray(synths)) {
      console.error('❌ synths is not an array:', synths);
      return;
    }
    
    const validSynths = synths.filter(validateEmployee);
    
    if (validSynths.length === 0) {
      console.error('❌ No valid synths found in:', synths);
      return;
    }
    
    // Convert synths to team members
    const newTeamMembers: TeamMember[] = validSynths
      .filter((synth: AIEmployee) => !teamMembers.some(member => member.id === synth.id))
      .map((synth: AIEmployee) => ({
        id: synth.id,
        name: synth.name || 'Unknown Name',
        role: synth.role || 'Unknown Role',
        profileImage: synth.profileImage || '/default-avatar.png',
        model: synth.baseModel || 'gpt-4',
        systemPrompt: synth.systemPrompt || '',
      }));

    if (newTeamMembers.length === 0) {
      return; // All employees already in thread
    }

    // Add all new team members at once to local state
    setTeamMembers(prev => [...prev, ...newTeamMembers]);

    // If no active thread exists, create a new thread with all members
    if (!activeThreadId) {
      const newTeam: Team = {
        id: crypto.randomUUID(), // Use proper UUID format
        name: `Team ${teams.length + 1}`,
        members: [...teamMembers, ...newTeamMembers],
        messages: [], // Start with empty messages for new team
        createdAt: new Date(),
        isActive: true
      };
      
              setTeams(prev => [...prev, newTeam]);
        setActiveThreadId(newTeam.id);
        setMessages([]); // Clear messages when creating new team
        
        // Also set the new team in the Zustand store
        await switchThread(newTeam.id);
    } else {
      // Update the active team if it exists (for UI continuity)
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { 
              ...team, 
              members: [...team.members, ...newTeamMembers],
              messages: team.messages // Keep current messages
            }
          : team
      ));
      
      // Persist to database if user is authenticated
      if (user && activeThreadId) {
        try {
          // Get current thread synths to check for duplicates
          const currentThreadSynths = await getThreadSynths(activeThreadId);
          const existingSynthIds = new Set(currentThreadSynths.map((ts: any) => ts.synth_id || ts.synthId).filter(Boolean));
          
          // Filter out synths that are already in the thread
          const synthsToAdd = validSynths.filter((synth: AIEmployee) => {
            let synthId: string;
            
            if (typeof synth.id === 'string') {
              // If it looks like a JSON string, try to parse it
              if (synth.id.startsWith('{') || synth.id.startsWith('[')) {
                try {
                  const parsed = JSON.parse(synth.id);
                  synthId = parsed.synthId || parsed.id || synth.id;
                } catch (e) {
                  synthId = synth.id;
                }
              } else {
                synthId = synth.id;
              }
            } else if (synth.id && typeof synth.id === 'object') {
              const objId = synth.id as any;
              synthId = objId.synthId || objId.id || String(synth.id);
            } else {
              return false; // Skip invalid IDs
            }
            
            // Clean up UUID format if needed
            if (synthId.includes('-') && !synthId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              synthId = synthId.replace(/['"{}]/g, '');
            }
            
            return !existingSynthIds.has(synthId);
          });
          
          if (synthsToAdd.length === 0) {
            console.log('✅ All synths are already in the thread, skipping database operations');
            return;
          }
          
          // Add each new synth to the thread in the database
          for (const synth of synthsToAdd) {
            // Process ID similar to handleAddToThread
            let synthId: string;
            
            if (typeof synth.id === 'string') {
              // If it looks like a JSON string, try to parse it
              if (synth.id.startsWith('{') || synth.id.startsWith('[')) {
                try {
                  const parsed = JSON.parse(synth.id);
                  synthId = parsed.synthId || parsed.id || synth.id;
                  console.log('🔍 Parsed JSON string ID to:', synthId);
                } catch (e) {
                  // If parsing fails, use the original string
                  console.log('🔍 Failed to parse JSON string ID, using original:', synth.id);
                  synthId = synth.id;
                }
              } else {
                synthId = synth.id;
              }
            } else if (synth.id && typeof synth.id === 'object') {
              // Handle case where ID is already an object
              const objId = synth.id as any;
              synthId = objId.synthId || objId.id || String(synth.id);
              console.log('🔍 Extracted ID from object:', synthId);
            } else {
              // Skip this synth if ID can't be determined
              console.error('❌ Could not determine valid synth ID:', synth);
              continue;
            }
            
            // Validate that synthId looks like a UUID if it's supposed to be one
            if (synthId.includes('-') && !synthId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              console.error('❌ Invalid UUID format:', synthId);
              // Try to clean up the ID - remove quotes, braces, etc.
              synthId = synthId.replace(/['"{}]/g, '');
              console.log('🔍 Cleaned up ID:', synthId);
            }
            
            // Check if this is a custom synth
            const isCustomSynth = customSynths.some(customSynth => customSynth.id === synthId);
            
            // Create a proper synth reference object
            const synthReference: COAITeamSynthReference = {
              synthId: synthId,
              isCustom: isCustomSynth,
              metadata: {
                model: synth.baseModel || 'gpt-4',
                systemPrompt: synth.systemPrompt || '',
                originalMemberId: synthId,
                name: synth.name,
                role: synth.role,
                profileImage: synth.profileImage
              }
            };
            
                      // Add synth to thread in the database
          await addSynthToThread(activeThreadId, synthId, synthReference);
        }
        console.log('✅ Multiple synths added to thread in database:', synthsToAdd.map((s: AIEmployee) => s.name));
        
        // Immediately refetch thread synths to update the store
        console.log('🔄 Refetching thread synths after adding multiple synths');
        refetchThreadSynths();
        } catch (error) {
          console.error('❌ Failed to add synths to thread in database:', error);
        }
      }
    }
  }, [activeThreadId, teams.length, teamMembers, setTeams, setActiveThreadId, setMessages, setTeamMembers, user, customSynths, addSynthToThread, getThreadSynths]);

  // Handler for updating team member
  const handleUpdateTeamMember = React.useCallback(async (member: TeamMember, updates: { systemPrompt?: string; model?: string }) => {
    const updatedMember = { 
      ...member, 
      model: updates.model || member.model,
      systemPrompt: updates.systemPrompt !== undefined ? updates.systemPrompt : member.systemPrompt
    };
    
    // Update local state first for immediate UI update
    setTeamMembers(prev => {
      return prev.map(m => m.id === member.id ? updatedMember : m);
    });
    
    setSelectedTeamMember(updatedMember);
    
    // Update the active team if it exists
    if (activeThreadId) {
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { 
              ...team, 
              members: team.members.map(m => m.id === member.id ? updatedMember : m),
              messages // Keep current messages
            }
          : team
      ));
    }

    // Persist changes to Supabase if user is authenticated and in an active thread
    if (user && activeThreadId) {
      try {
        // Check if this is a custom synth or built-in synth
        const isCustomSynth = customSynths.some(synth => synth.id === member.id);
        
        // If it's a custom synth, update the synth data in the synths table
        if (isCustomSynth) {
          // Update the custom synth's base data if systemPrompt or model changed
          const customSynth = customSynths.find(synth => synth.id === member.id);
          if (customSynth) {
            const updatedSynthData: Partial<COAISynthData> = {
              ...customSynth,
              systemPrompt: updatedMember.systemPrompt,
              baseModel: updatedMember.model as any
            };
            
            try {
              await updateSynth(member.id, updatedSynthData);
              console.log('✅ Custom synth data updated in Supabase:', member.id);
            } catch (error) {
              console.error('❌ Failed to update custom synth data in Supabase:', error);
            }
          }
        }

        // Check if synth exists in current thread and update its reference
        const threadSynth = threadSynths.find(synth => synth.id === member.id);
        
        if (threadSynth) {
          // Update the synth reference metadata in the thread
          const updatedReference: Partial<COAITeamSynthReference> = {
            metadata: {
              model: updatedMember.model,
              systemPrompt: updatedMember.systemPrompt,
              name: updatedMember.name,
              role: updatedMember.role,
              profileImage: updatedMember.profileImage
            }
          };
          
          try {
            await updateTeamSynthReference(activeThreadId, member.id, updatedReference);
            console.log('✅ Thread synth reference updated in Supabase:', member.id);
          } catch (error) {
            console.error('❌ Failed to update thread synth reference in Supabase:', error);
          }
        }
      } catch (error) {
        console.error('❌ Failed to persist team member updates to Supabase:', error);
        // Keep the local updates even if Supabase update fails
      }
    }
  }, [activeThreadId, user, customSynths, threadSynths, updateSynth, updateTeamSynthReference]);

  // Legacy handleSendMessage removed - using directService instead



  // Enhanced handleSendMessage using directService for proper streaming
  const handleSendMessage = React.useCallback(async (messageData: { display: string; full: string } | string, attachedImage?: any) => {
    if (teamMembers.length === 0) {
      console.log('🚨 [HANDLER DEBUG] No team members, returning early');
      return;
    }

    if (!activeThreadId) {
      console.log('🚨 [HANDLER DEBUG] No active thread, returning early');
      return;
    }

    // Check if API key is provided
    if (!isApiKeyValid) {
      console.error('❌ No OpenAI API key provided');
      return;
    }
    
    // Handle both old string format and new object format for backward compatibility
    const displayContent = typeof messageData === 'string' ? messageData : messageData.display;
    const fullContent = typeof messageData === 'string' ? messageData : messageData.full;
    
    console.log('🚨 [HANDLER DEBUG] Using directService for message sending');
    console.log('🚨 [HANDLER DEBUG] Display content:', displayContent.substring(0, 100) + '...');
    console.log('🚨 [HANDLER DEBUG] Full content:', fullContent.substring(0, 100) + '...');
    
    // Use directService to handle the message - this will use proper streaming
    try {
      await directService.sendMessage(activeThreadId, {
        content: fullContent, // Use full content for AI processing
        sender: 'user',
        ...(attachedImage && { image: attachedImage })
      });
      console.log('✅ [HANDLER DEBUG] Message sent via directService');
    } catch (error) {
      console.error('❌ [HANDLER DEBUG] Failed to send message via directService:', error);
    }
  }, [teamMembers, isApiKeyValid, activeThreadId]);

  // Handle AI continuation (spacebar trigger) - WORKING VERSION
  const handleAIContinue = React.useCallback(async () => {
    console.log('🚀 [AI CONTINUE DEBUG] handleAIContinue called');
    console.log('🚀 [AI CONTINUE DEBUG] teamMembers.length:', teamMembers.length);
    console.log('🚀 [AI CONTINUE DEBUG] threadTeamMembers.length:', threadTeamMembers.length);
    console.log('🚀 [AI CONTINUE DEBUG] threadSynths.length:', threadSynths.length);
    console.log('🚀 [AI CONTINUE DEBUG] isApiKeyValid:', isApiKeyValid);
    console.log('🚀 [AI CONTINUE DEBUG] activeThreadId:', activeThreadId);
    
    // Use threadSynths (the actual synths in the current thread) instead of teamMembers
    if (threadSynths.length === 0) {
      console.log('🚀 [AI CONTINUE DEBUG] No thread synths, returning early');
      return;
    }

    // Check if API key is provided
    if (!isApiKeyValid) {
      console.error('❌ No OpenAI API key provided for AI continuation');
      return;
    }
    
    console.log('🚀 [AI CONTINUE DEBUG] API key validation passed, proceeding with AI continuation');
    
    // Use directService to handle AI continuation - this will trigger all team members to respond
    try {
      if (activeThreadId) {
        console.log('🚀 [AI CONTINUE DEBUG] Sending AI continuation message to thread:', activeThreadId);
        await directService.sendMessage(activeThreadId, {
          content: '[Continue the conversation - explore the topic further and share your thoughts among the team]',
          sender: 'user'
        });
        console.log('✅ [AI CONTINUE DEBUG] AI continuation message sent via directService');
      } else {
        console.log('🚀 [AI CONTINUE DEBUG] No active thread for directService, skipping');
      }
    } catch (error) {
      console.error('❌ [AI CONTINUE DEBUG] Failed to send AI continuation via directService:', error);
    }
  }, [threadSynths, threadTeamMembers, teamMembers, isApiKeyValid, activeThreadId]);

  // Legacy randomizeTeamOrder removed - using directService instead

  // Team management handlers
  const handleSelectTeam = React.useCallback(async (teamId: string) => {
    // Switch to the new thread/chat
    try {
      console.log('🔍 DEBUG: handleSelectTeam called with teamId:', teamId);
      
      // Since we're using threads as "teams" in the UI, teamId is actually threadId
      await directService.setActiveThreadId(teamId);
      setActiveThreadId(teamId);
      
      // Also set the active thread in the Zustand store
      await switchThread(teamId);
      
      // Load messages for the selected thread
      if (user) {
        try {
          const threadMessages = await directService.fetchMessages(teamId);
          const convertedMessages = threadMessages.map(msg => directService.convertMessageDataToChatMessage(msg));
          setMessages(convertedMessages);
          
          // Explicitly trigger thread synths loading
          console.log('🔍 DEBUG: Explicitly loading thread synths for:', teamId);
          refetchThreadSynths();
        } catch (error) {
          console.error('Failed to load thread messages:', error);
          setMessages([]);
        }
      } else {
        // For non-authenticated users, just switch locally
        const selectedThread = teams.find(team => team.id === teamId);
        if (selectedThread) {
          setTeamMembers(selectedThread.members);
          setMessages(selectedThread.messages);
        }
      }
      
      console.log('✅ Switched to thread:', teamId);
    } catch (error) {
      console.error('Failed to switch thread:', error);
    }
  }, [teams, user, refetchThreadSynths]);

  const handleEditTeamName = React.useCallback(async (teamId: string, newName: string) => {
    // Update local state immediately for instant UI feedback
    setTeams(prev => {
      const updatedTeams = prev.map(team => 
        team.id === teamId ? { ...team, name: newName } : team
      );
      saveThreadsCache(updatedTeams); // Update cache with new name
      return updatedTeams;
    });
    
    // Persist to Supabase asynchronously via directService
    if (user) {
      try {
        await directService.updateThread(teamId, { title: newName });
        console.log('✅ Thread name updated in Supabase:', teamId, newName);
      } catch (error) {
        console.error('❌ Failed to update thread name in Supabase:', error);
        // Could add user notification here if needed
      }
    }
  }, [user]);

  // Create a new CHAT/THREAD 
  const handleCreateNewChat = React.useCallback(async () => {
    // Prevent multiple clicks
    if (isWaitingForStream) return;
    
    if (user) {
      try {
        // Create thread in Supabase FIRST, then update UI
        const newThreadTitle = `Chat ${new Date().toLocaleString()}`;
        const realThread = await directService.createThread(newThreadTitle);
        
        const newThreadAsTeam: Team = {
          id: realThread.id, // Use the real Supabase ID immediately
          name: newThreadTitle,
          members: [], // Start with empty synths list for new thread
          messages: [], // Start fresh
          createdAt: new Date(),
          isActive: true,
        };
        
        // Add to UI with real ID
        setTeams(prev => {
          const updatedTeams = [newThreadAsTeam, ...prev];
          saveThreadsCache(updatedTeams);
          return updatedTeams;
        });
        setActiveThreadId(realThread.id);
        setTeamMembers([]); // Clear team members for new thread
        setMessages([]);
        
        // Set the real thread in the Zustand store
        await switchThread(realThread.id);
        
        // Also update Supabase active thread via directService
        await directService.setActiveThreadId(realThread.id);
        
        console.log('✅ Thread created in Supabase with real ID:', realThread.id);
        console.log('💬 New chat thread created (empty - no synths copied)');
      } catch (error) {
        console.error('❌ Failed to create thread in Supabase:', error);
        
        // Fallback: create optimistic thread if Supabase fails
        const optimisticThreadId = crypto.randomUUID();
        const optimisticThreadTitle = `Chat ${new Date().toLocaleString()}`;
        
        const newThreadAsTeam: Team = {
          id: optimisticThreadId,
          name: optimisticThreadTitle,
          members: [],
          messages: [],
          createdAt: new Date(),
          isActive: true,
        };
        
        setTeams(prev => {
          const updatedTeams = [newThreadAsTeam, ...prev];
          saveThreadsCache(updatedTeams);
          return updatedTeams;
        });
        setActiveThreadId(optimisticThreadId);
        setTeamMembers([]);
        setMessages([]);
        
        await switchThread(optimisticThreadId);
        
        console.log('⚠️ Using optimistic thread due to Supabase error:', optimisticThreadId);
      }
    } else {
      // For unauthenticated users, just clear messages locally
      setTeamMembers([]); // Clear team members for new thread
      setMessages([]);
      console.log('💬 Created new local chat (empty - no synths copied)');
    }
  }, [user, teamMembers, teams.length, isWaitingForStream, saveThreadsCache, customSynths, addSynthToThread]);



  const handleClearChat = React.useCallback(async () => {
    if (!activeThreadId) {
      console.log('No active thread to clear');
      return;
    }

    try {
      // Get all messages for the current thread from the Zustand store
      const { getState } = await import('../../stores');
      const state = getState();
      
      // Get message IDs for the active thread
      const messageIds = state.relationships.threadMessages[activeThreadId] || [];
      
      if (messageIds.length === 0) {
        console.log('No messages to clear in thread:', activeThreadId);
        return;
      }

      console.log(`🗑️ Clearing ${messageIds.length} messages from thread:`, activeThreadId);

      // Delete all messages from the database and store
      const deletePromises = messageIds.map(messageId => 
        state.deleteMessage(messageId)
      );

      await Promise.all(deletePromises);

      // Clear local UI state as well (for legacy compatibility)
      setMessages([]);
      
      // Clear messages from active team in local state
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { ...team, messages: [] }
          : team
      ));

      console.log('✅ Successfully cleared all messages from thread:', activeThreadId);
    } catch (error) {
      console.error('❌ Failed to clear chat messages:', error);
      // Still clear the UI even if database deletion fails
      setMessages([]);
      if (activeThreadId) {
        setTeams(prev => prev.map(team => 
          team.id === activeThreadId 
            ? { ...team, messages: [] }
            : team
        ));
      }
    }
  }, [activeThreadId, setMessages, setTeams]);

  const handleDeleteTeam = React.useCallback(async (teamId: string) => {
    // Update UI immediately for instant feedback
    setTeams(prev => {
      const updatedTeams = prev.filter(team => team.id !== teamId);
      saveThreadsCache(updatedTeams); // Update cache after deletion
      return updatedTeams;
    });
    
    // If deleting the active thread, switch to another thread or clear active thread
    if (teamId === activeThreadId) {
      const remainingTeams = teams.filter(team => team.id !== teamId);
      if (remainingTeams.length > 0) {
        // Switch to the first available thread
        setActiveThreadId(remainingTeams[0].id);
        setTeamMembers(remainingTeams[0].members);
        setMessages(remainingTeams[0].messages);
        
        // Update active thread in Supabase and Zustand store
        if (user) {
          try {
            await directService.setActiveThreadId(remainingTeams[0].id);
            await switchThread(remainingTeams[0].id);
          } catch (error) {
            console.error('❌ Failed to update active thread:', error);
          }
        }
      } else {
        // No threads left, clear everything
        setActiveThreadId(null);
        setTeamMembers([]);
        setMessages([]);
        
        // Clear active thread in Supabase and Zustand store
        if (user) {
          try {
            await directService.setActiveThreadId(null);
            await switchThread(null);
          } catch (error) {
            console.error('❌ Failed to clear active thread:', error);
          }
        }
      }
    }
    
    // Delete thread from Supabase
    if (user) {
      try {
        await directService.deleteThread(teamId);
        console.log('✅ Thread deleted from Supabase:', teamId);
      } catch (error) {
        console.error('❌ Failed to delete thread from Supabase:', error);
        // Could add user notification here if needed
      }
    }
  }, [teams, activeThreadId, setActiveThreadId, setTeamMembers, setMessages, setTeams, user, saveThreadsCache]);



  const handleRemoveMessage = React.useCallback((messageId: string) => {
    // Remove message from current messages state
    setMessages(prev => prev.filter(message => message.id !== messageId));
    
    // Remove message from active team if it exists
    if (activeThreadId) {
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { 
              ...team, 
              messages: team.messages.filter(message => message.id !== messageId)
            }
          : team
      ));
    }
  }, [activeThreadId, setMessages, setTeams]);

  // Global keyboard shortcuts for team switching, AI continuation, and browser toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Handle Command+B (or Ctrl+B) for browser toggle
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsBrowserCollapsed(prev => !prev);
        return;
      }
      
      // Handle spacebar for AI continuation (global, even when not typing)
      if (event.key === ' ' && !isTyping && teamMembers.length > 0 && !isWaitingForStream) {
        console.log('🚀 [SPACEBAR DEBUG] Spacebar pressed for AI continuation');
        console.log('🚀 [SPACEBAR DEBUG] isTyping:', isTyping);
        console.log('🚀 [SPACEBAR DEBUG] teamMembers.length:', teamMembers.length);
        console.log('🚀 [SPACEBAR DEBUG] isWaitingForStream:', isWaitingForStream);
        
        event.preventDefault();
        
        const now = Date.now();
        // Reset count if more than 3 seconds have passed since last press
        if (now - lastGlobalSpacebarPress > 3000) {
          setGlobalSpacebarCount(1);
        } else {
          setGlobalSpacebarCount(prev => prev + 1);
        }
        setLastGlobalSpacebarPress(now);
        
        console.log('🚀 [SPACEBAR DEBUG] Calling handleAIContinue...');
        handleAIContinue();
        return;
      }
      
      // Only trigger team switching on number keys 1-9, and ignore if user is typing
      if (isTyping) return;
      
      const keyNumber = parseInt(event.key);
      if (keyNumber >= 1 && keyNumber <= 9) {
        const teamIndex = keyNumber - 1;
        if (teams[teamIndex] && teams[teamIndex].id !== activeThreadId) {
          handleSelectTeam(teams[teamIndex].id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [teams, activeThreadId, handleSelectTeam, teamMembers, isWaitingForStream, handleAIContinue]);

  // Reset global spacebar count when new AI messages arrive
  useEffect(() => {
    const aiMessages = messages.filter(msg => msg.sender === 'ai');
    if (aiMessages.length > 0) {
      setGlobalSpacebarCount(0);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      <Header 
        isBrowserCollapsed={isBrowserCollapsed}
        onToggleBrowser={() => setIsBrowserCollapsed(!isBrowserCollapsed)}
        isLoadingData={isLoadingData}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {!isBrowserCollapsed && (
          <div className="w-[30%] flex-shrink-0">
            <BrowserPanel
              customSynths={customSynths}
              onSelectEmployee={handleSelectEmployee}
              onQuickAdd={handleAddToThread}
              onQuickAddTeam={handleQuickAddToThread}
              onSelectTeam={handleSelectCustomTeam}
              onSelectCustomTeam={handleSelectCustomTeam}
              onAddNewTeam={handleAddNewTeam}
              onAddNewSynth={handleAddNewSynth}
              onEditSynth={handleEditSynth}
              onDeleteSynth={handleDeleteSynth}
              customTeams={customTeams}
              onToggleCollapse={() => {
                setIsBrowserCollapsed(!isBrowserCollapsed);
              }}
            />
          </div>
        )}
        
        {(selectedEmployee || selectedTeamMember || selectedPremadeTeam || selectedCustomTeam) && !isProfileCollapsed && (
          <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:w-80 lg:w-96 md:flex-shrink-0 bg-white dark:bg-neutral-900">
            {selectedPremadeTeam ? (
              <TeamProfile
                team={{
                  id: selectedPremadeTeam.id,
                  name: selectedPremadeTeam.team_data.name,
                  selectedSynths: [], // COAITeam doesn't have selectedSynths, would need to fetch from team-synths
                  createdAt: new Date(selectedPremadeTeam.created_at),
                  description: selectedPremadeTeam.team_data.description,
                  teamImage: selectedPremadeTeam.team_data.teamImage
                }}
                onBack={() => {
                  setIsProfileCollapsed(true);
                  setSelectedPremadeTeam(null);
                }}
                onAddTeam={handleQuickAddToThread}
                onSelectEmployee={handleSelectEmployee}
              />
            ) : selectedCustomTeam ? (
              <CustomTeamProfile
                team={selectedCustomTeam}
                onBack={() => {
                  setIsProfileCollapsed(true);
                  setSelectedCustomTeam(null);
                }}
                onAddTeam={handleQuickAddToThread}
                onSelectEmployee={handleSelectEmployee}
                onEditTeam={handleEditCustomTeam}
                onDeleteTeam={handleDeleteCustomTeam}
              />
            ) : (
              <ProfileSection
                employee={selectedEmployee}
                teamMember={selectedTeamMember}
                onAddToTeam={handleAddToThread}
                onUpdateTeamMember={handleUpdateTeamMember}
                onDeleteSynth={handleDeleteSynth}
                isCustomSynth={selectedEmployee ? customSynths.some(synth => synth.id === selectedEmployee.id) : false}
                isCollapsed={isProfileCollapsed}
                onToggleCollapse={() => {
                  setIsProfileCollapsed(true);
                  setSelectedEmployee(null);
                  setSelectedTeamMember(null);
                }}
              />
            )}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <ChatSection
            teamMembers={teamMembers}
            onRemoveTeamMember={handleRemoveTeamMember}
            onAddTeamMember={handleAddToThread}
            onAddTeam={handleQuickAddToThread}
            onSelectTeamMember={handleSelectTeamMember}
            messages={messages}
            onSendMessage={handleSendMessage}
            onAIContinue={handleAIContinue}
            onRemoveMessage={handleRemoveMessage}
            employees={customSynths}
            threads={teams}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectTeam}
            onEditThreadName={handleEditTeamName}
            onCreateChat={handleCreateNewChat}
            onDeleteThread={handleDeleteTeam}
            onClearChat={handleClearChat}
            isWaitingForStream={isWaitingForStream}
            globalSpacebarCount={globalSpacebarCount}
          />
        </div>
      </div>
      
      {/* Edit Team Modal */}
      <EditTeamModal
        isOpen={isEditTeamModalOpen}
        onClose={handleCloseEditTeamModal}
        onSave={handleSaveEditedTeam}
        availableSynths={customSynths}
        customSynths={customSynths}
        team={teamToEdit}
      />
    </div>
  );
};

export default Layout;