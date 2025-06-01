import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import BrowserPanel from '../browser/BrowserPanel';
import ProfileSection from '../profile/ProfileSection';
import TeamProfile from '../profile/TeamProfile';
import CustomTeamProfile from '../profile/CustomTeamProfile';
import ChatSection from '../chat/ChatSection';
import EditTeamModal from '../browser/EditTeamModal';
import { AIEmployee, ChatMessage, TeamMember, Team } from '@/types';
import { PremadeTeam } from '@/data/premadeTeams';
import { CustomTeam } from '../browser/CreateTeamModal';
import { streamChat } from '@/lib/supabase';
import { HumanTiming, sleep } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { SupabaseAdapter } from '@/lib/storage';
import { useTeamDynamics } from '@/hooks/useTeamDynamics';
import { useApiKey } from '@/lib/apiKeyContext';
import { useThreadSynths, useSynths, useTeams } from '@/hooks/useCOAI';
import { COAITeamSynthReference, COAISynthData, COAITeamSynth } from '@/types';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  employees: AIEmployee[];
  initialMessages: ChatMessage[];
}

const Layout: React.FC<LayoutProps> = ({ employees, initialMessages }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedPremadeTeam, setSelectedPremadeTeam] = useState<PremadeTeam | null>(null);
  const [selectedCustomTeam, setSelectedCustomTeam] = useState<CustomTeam | null>(null);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(true);
  const [isBrowserCollapsed, setIsBrowserCollapsed] = useState(false);
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  const [globalSpacebarCount, setGlobalSpacebarCount] = useState(0);
  const [lastGlobalSpacebarPress, setLastGlobalSpacebarPress] = useState(0);
  
  // Edit team modal state
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<CustomTeam | null>(null);
  
  // API key context
  const { openaiApiKey, isApiKeyValid } = useApiKey();
  
  // Auth context
  const { user } = useAuth();
  
  // Simple state management - no persistence for unauthenticated users
  const [teams, setTeams] = useState<Team[]>([]);
  const [messages, setMessagesRaw] = useState<ChatMessage[]>(initialMessages);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Lightweight cache management for thread metadata (just for UI continuity)
  const saveThreadsCache = React.useCallback((threads: Team[]) => {
    if (user) {
      try {
        const cacheData = threads.map(t => ({
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
      const cachedThreads = loadThreadsCache();
      if (cachedThreads.length > 0) {
        console.log('📦 Loading cached threads for instant display:', cachedThreads.length);
        setTeams(cachedThreads);
      }
    }
  }, [user, teams.length, isLoadingData, loadThreadsCache]);
  
  // Supabase adapter - only available when user is authenticated (memoized to prevent infinite loops)
  const adapter = React.useMemo(() => {
    return user ? new SupabaseAdapter(user.id) : null;
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
  
  // Thread synths hook - for managing synths in the current thread
  const {
    threadSynths,
    addSynthToThread,
    removeSynthFromThread,
    updateThreadSynthReference,
    refetch: refetchThreadSynths
  } = useThreadSynths(activeThreadId || '');

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
    loading: _teamsLoading,
    error: _teamsError,
    refetch: refetchSupabaseTeams
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
        console.log('📥 Loaded team synths for all teams:', Object.keys(newTeamSynthsMap).length);
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
          // Look for built-in employee
          synthData = employees.find(emp => emp.id === synthRef.synthId) || null;
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
  }, [supabaseTeams, teamSynthsMap, customSynths, employees]);

  // Load thread synths when active thread changes
  React.useEffect(() => {
    if (user && activeThreadId) {
      console.log('🔄 Active thread changed, loading thread synths:', activeThreadId);
      refetchThreadSynths();
    }
  }, [user, activeThreadId, refetchThreadSynths]);

  // Sync thread synths with team members when thread synths are loaded
  React.useEffect(() => {
    if (user && activeThreadId && threadSynths.length > 0) {
      console.log('🔄 Syncing thread synths with team members:', threadSynths.length);
      
      // Convert thread synths to team members for UI consistency
      const synthTeamMembers = threadSynths
        .filter(ts => ts.synth || ts.reference) // Ensure we have valid synth data
        .map(ts => {
          if (ts.synth) {
            // Custom synth with full data
            return {
              id: ts.synth.id,
              name: ts.synth.name,
              role: ts.synth.role,
              profileImage: ts.synth.profileImage,
              model: ts.reference.metadata?.model || 'gpt-4',
              systemPrompt: ts.reference.metadata?.systemPrompt || ts.synth.systemPrompt || '',
            };
          } else {
            // Built-in synth from reference metadata  
            const employee = employees.find(e => e.id === ts.reference.synthId);
            return {
              id: ts.reference.synthId,
              name: employee?.name || ts.reference.metadata?.name || 'Unknown',
              role: employee?.role || ts.reference.metadata?.role || 'Unknown',
              profileImage: employee?.profileImage || ts.reference.metadata?.profileImage || '/default-avatar.png',
              model: ts.reference.metadata?.model || 'gpt-4',
              systemPrompt: ts.reference.metadata?.systemPrompt || employee?.systemPrompt || '',
            };
          }
        });
      
      console.log('📝 Converting thread synths to team members:', synthTeamMembers.map(m => ({ id: m.id, name: m.name })));
      setTeamMembers(synthTeamMembers);
      
      // Update the active team in teams array as well
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { ...team, members: synthTeamMembers }
          : team
      ));
    } else if (user && activeThreadId && threadSynths.length === 0) {
      // No thread synths found, clear team members
      console.log('📝 No thread synths found, clearing team members');
      setTeamMembers([]);
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { ...team, members: [] }
          : team
      ));
    }
  }, [activeThreadId, threadSynths, user, employees, setTeamMembers, setTeams]); // Include employees to get built-in synth data

  // Sync Supabase synths with local state
  React.useEffect(() => {
    if (user && supabaseCustomSynths && supabaseCustomSynths.length > 0) {
      console.log('📥 Loading synths from Supabase:', supabaseCustomSynths.length);
      
      // Convert COAISynth to AIEmployee format
      const convertedSynths: AIEmployee[] = supabaseCustomSynths.map(synthRow => ({
        id: synthRow.id,
        ...synthRow.synth_data
      }));
      
      setCustomSynths(convertedSynths);
    } else if (user && supabaseCustomSynths && supabaseCustomSynths.length === 0) {
      // User is logged in but has no synths
      console.log('📥 No synths found in Supabase for user');
      setCustomSynths([]);
    }
  }, [user, supabaseCustomSynths]);

  // Load data when user becomes authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!user || !adapter) {
        // Clear data when user logs out
        setTeams([]);
        setActiveThreadId(null);
        setTeamMembers([]);
        setCustomSynths([]);
        // customTeams are now managed by useTeams hook
        setIsLoadingData(false);
        return;
      }
      
      try {
        setIsLoadingData(true);
        console.log('🔄 Loading data from Supabase for authenticated user');
        const [loadedThreads, loadedActiveThreadId] = await Promise.all([
          adapter.getThreads(), // Get individual chat threads
          adapter.getActiveThreadId()
        ]);
        
        // Always update state, but intelligently merge with optimistic updates
        setTeams(prev => {
          // If we have threads that start with 'thread-' (optimistic), preserve them
          const optimisticThreads = prev.filter(t => t.id.startsWith('thread-'));
          if (optimisticThreads.length > 0) {
            console.log('⚠️ Preserving optimistic threads and merging with Supabase data:', optimisticThreads.map(t => t.id));
            // Merge loaded threads with optimistic ones, keeping optimistic ones at the top
            const nonOptimisticLoaded = loadedThreads.filter(t => !optimisticThreads.some(opt => opt.id === t.id));
            const finalThreads = [...optimisticThreads, ...nonOptimisticLoaded];
            saveThreadsCache(finalThreads); // Update cache with merged data
            return finalThreads;
          }
          console.log('📥 Loading fresh threads from Supabase:', loadedThreads.length);
          saveThreadsCache(loadedThreads); // Update cache with fresh data
          return loadedThreads;
        });
        
        setActiveThreadId(loadedActiveThreadId);
        
        // Load active thread data
        if (loadedActiveThreadId) {
          const activeThread = loadedThreads.find(thread => thread.id === loadedActiveThreadId);
          if (activeThread) {
            console.log('📥 Loading active thread messages:', activeThread.messages.length);
            setMessages(activeThread.messages);
            setTeamMembers(activeThread.members);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load data from Supabase:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadData();
  }, [user?.id, saveThreadsCache]); // Only depend on user.id to prevent unnecessary reloads

  // Custom teams are now managed by the useTeams hook

  // Validation function for employees/synths
  const validateEmployee = (employee: any): employee is AIEmployee => {
    return employee && 
           typeof employee === 'object' && 
           employee.id && 
           employee.name && 
           employee.role;
  };

  // Natural Team Dynamics hook
  const { 
    isNaturalDynamicsEnabled, 
    // handleUserMessageWithDynamics
  } = useTeamDynamics({
    enableNaturalDynamics: true,
    debugMode: true
  });

  // No persistence for custom synths when user is not authenticated

  // Handler for adding new custom synth
  const handleAddNewSynth = React.useCallback(async (newSynth: AIEmployee) => {
    // If user is logged in, persist to Supabase first to get the correct ID
    if (user) {
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
          console.log('✅ Synth successfully saved to Supabase:', savedSynth.id);
          
          // Create the synth with the Supabase-generated ID
          const synthWithSupabaseId: AIEmployee = {
            ...newSynth,
            id: savedSynth.id
          };
          
          // Add to local state with the correct ID
          setCustomSynths(prev => [synthWithSupabaseId, ...prev]);
        } else {
          console.error('❌ Failed to save synth to Supabase - no data returned');
          // Fallback: add to local state with original ID
          setCustomSynths(prev => [newSynth, ...prev]);
        }
      } catch (error) {
        console.error('❌ Failed to save synth to Supabase:', error);
        // Fallback: add to local state with original ID
        setCustomSynths(prev => [newSynth, ...prev]);
      }
    } else {
      // User not logged in, just add to local state
      setCustomSynths(prev => [newSynth, ...prev]);
    }
    // Don't add to main employees list - keep custom synths separate
  }, [user, createSynth]);

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
        const success = await deleteSynth(synthId);
        if (success) {
          console.log('✅ Synth successfully deleted from Supabase:', synthId);
        } else {
          console.error('❌ Failed to delete synth from Supabase');
        }
      } catch (error) {
        console.error('❌ Failed to delete synth from Supabase:', error);
        // Keep the local deletion even if Supabase deletion fails
      }
    }
  }, [user, deleteSynth, setTeamMembers]);

  // No persistence for custom teams when user is not authenticated



  // No auto-save needed - messages are saved immediately when created

  const handleSelectEmployee = React.useCallback((employee: AIEmployee) => {
    setSelectedEmployee(employee);
    setSelectedTeamMember(null); // Clear team member selection
    setSelectedPremadeTeam(null); // Clear premade team selection
    setSelectedCustomTeam(null); // Clear custom team selection
    setIsProfileCollapsed(false);
  }, []);

  const handleSelectPremadeTeam = React.useCallback((team: PremadeTeam) => {
    setSelectedPremadeTeam(team);
    setSelectedEmployee(null); // Clear employee selection
    setSelectedTeamMember(null); // Clear team member selection
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
    
    // First, extract any new synths that aren't already in customSynths or employees
    const existingSynthIds = new Set([
      ...employees.map(e => e.id),
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
      
      // Update synths with real IDs for local state
      const synthsWithRealIds = newSynths.map(synth => ({
        ...synth,
        id: savedSynthIdMap.get(synth.id) || synth.id
      }));
      
      setCustomSynths(prev => {
        const updated = [...synthsWithRealIds, ...prev];
        console.log(`🔍 [ADD TEAM DEBUG] Updated customSynths array now has ${updated.length} synths:`, updated.map(s => ({ id: s.id, name: s.name })));
        return updated;
      });
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
  }, [employees, customSynths, user, createSynth, createSupabaseTeam]);

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
    const newTeamMember: TeamMember = {
      id: employee.id,
      name: employee.name || 'Unknown Name',
      role: employee.role || 'Unknown Role',
      profileImage: employee.profileImage || '/default-avatar.png',
      model: employee.baseModel || 'gpt-4',
      systemPrompt: employee.systemPrompt || '',
    };

    // Add to local team members state for UI
    setTeamMembers(prev => {
      if (prev.some(member => member.id === employee.id)) return prev;
      return [...prev, newTeamMember];
    });

    // If no active thread exists, automatically create a new thread
    if (!activeThreadId) {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: `Team ${teams.length + 1}`,
        members: [newTeamMember],
        messages: [], // Start with empty messages for new team
        createdAt: new Date(),
        isActive: true
      };
      
      setTeams(prev => [...prev, newTeam]);
      setActiveThreadId(newTeam.id);
      setMessages([]); // Clear messages when creating new team
    } else {
      // Update the active team if it exists (for UI continuity)
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { 
              ...team, 
              members: team.members.some(m => m.id === employee.id) 
                ? team.members 
                : [...team.members, newTeamMember],
              messages // Keep current messages
            }
          : team
      ));
      
      // Persist to database if user is authenticated
      if (user && activeThreadId) {
        try {
          // Determine if this is a custom synth or built-in
          const isCustomSynth = customSynths.some(synth => synth.id === employee.id);
          
          const synthReference: COAITeamSynthReference = {
            synthId: employee.id,
            isCustom: isCustomSynth,
            metadata: {
              model: employee.baseModel || 'gpt-4',
              systemPrompt: employee.systemPrompt || '',
              originalMemberId: employee.id,
              name: employee.name,
              role: employee.role,
              profileImage: employee.profileImage
            }
          };

          // If this is a custom synth with updated prompt/model, also update the synth data
          if (isCustomSynth) {
            const existingCustomSynth = customSynths.find(synth => synth.id === employee.id);
            if (existingCustomSynth && 
                (existingCustomSynth.systemPrompt !== employee.systemPrompt || 
                 existingCustomSynth.baseModel !== employee.baseModel)) {
              
              const updatedSynthData: Partial<COAISynthData> = {
                ...existingCustomSynth,
                systemPrompt: employee.systemPrompt,
                baseModel: employee.baseModel
              };
              
              try {
                const synthUpdateSuccess = await updateSynth(employee.id, updatedSynthData);
                if (synthUpdateSuccess) {
                  console.log('✅ Custom synth updated with new prompt/model before adding to thread:', employee.id);
                } else {
                  console.error('❌ Failed to update custom synth with new prompt/model');
                }
              } catch (updateError) {
                console.error('❌ Error updating custom synth with new prompt/model:', updateError);
              }
            }
          }
          
          await addSynthToThread(isCustomSynth ? employee.id : null, synthReference);
          console.log('✅ Synth added to thread in database:', employee.name);
        } catch (error) {
          console.error('❌ Failed to add synth to thread in database:', error);
        }
      }
    }
  }, [activeThreadId, teams.length, setTeams, setActiveThreadId, setMessages, setTeamMembers, user, customSynths, addSynthToThread]);

  const handleQuickAddToThread = React.useCallback(async (employees: AIEmployee[]) => {
    // Validate that employees is an array and filter out invalid entries
    if (!Array.isArray(employees)) {
      console.error('❌ employees is not an array:', employees);
      return;
    }
    
    const validEmployees = employees.filter(validateEmployee);
    
    if (validEmployees.length === 0) {
      console.error('❌ No valid employees found in:', employees);
      return;
    }
    
    // Convert employees to team members
    const newTeamMembers: TeamMember[] = validEmployees
      .filter(employee => !teamMembers.some(member => member.id === employee.id))
      .map(employee => ({
        id: employee.id,
        name: employee.name || 'Unknown Name',
        role: employee.role || 'Unknown Role',
        profileImage: employee.profileImage || '/default-avatar.png',
        model: employee.baseModel || 'gpt-4',
        systemPrompt: employee.systemPrompt || '',
      }));

    if (newTeamMembers.length === 0) {
      return; // All employees already in thread
    }

    // Add all new team members at once to local state
    setTeamMembers(prev => [...prev, ...newTeamMembers]);

    // If no active thread exists, create a new thread with all members
    if (!activeThreadId) {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: `Team ${teams.length + 1}`,
        members: [...teamMembers, ...newTeamMembers],
        messages: [], // Start with empty messages for new team
        createdAt: new Date(),
        isActive: true
      };
      
      setTeams(prev => [...prev, newTeam]);
      setActiveThreadId(newTeam.id);
      setMessages([]); // Clear messages when creating new team
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
          // Add each synth to the thread in the database
          for (const employee of validEmployees) {
            const isCustomSynth = customSynths.some(synth => synth.id === employee.id);
            
            const synthReference: COAITeamSynthReference = {
              synthId: employee.id,
              isCustom: isCustomSynth,
              metadata: {
                model: employee.baseModel || 'gpt-4',
                systemPrompt: employee.systemPrompt || '',
                originalMemberId: employee.id,
                name: employee.name,
                role: employee.role,
                profileImage: employee.profileImage
              }
            };
            
            await addSynthToThread(isCustomSynth ? employee.id : null, synthReference);
          }
          console.log('✅ Multiple synths added to thread in database:', validEmployees.map(e => e.name));
        } catch (error) {
          console.error('❌ Failed to add synths to thread in database:', error);
        }
      }
    }
  }, [activeThreadId, teams.length, teamMembers, setTeams, setActiveThreadId, setMessages, setTeamMembers, user, customSynths, addSynthToThread]);
  
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
          // Find the thread synth to remove
          const synthToRemove = threadSynths.find(ts => 
            ts.synth?.id === id || ts.reference.synthId === id
          );
          
          if (synthToRemove) {
            await removeSynthFromThread(synthToRemove.threadSynthId);
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
            
            const synthUpdateSuccess = await updateSynth(member.id, updatedSynthData);
            if (synthUpdateSuccess) {
              console.log('✅ Custom synth data updated in Supabase:', member.id);
            } else {
              console.error('❌ Failed to update custom synth data in Supabase');
            }
          }
        }

        // Find the thread synth to update its reference metadata
        const threadSynth = threadSynths.find(ts => 
          ts.synth?.id === member.id || ts.reference.synthId === member.id
        );
        
        if (threadSynth) {
          // Update the synth reference metadata in the thread
          const updatedReference: COAITeamSynthReference = {
            ...threadSynth.reference,
            metadata: {
              ...threadSynth.reference.metadata,
              model: updatedMember.model,
              systemPrompt: updatedMember.systemPrompt,
              name: updatedMember.name,
              role: updatedMember.role,
              profileImage: updatedMember.profileImage
            }
          };
          
          const referenceUpdateSuccess = await updateThreadSynthReference(threadSynth.threadSynthId, updatedReference);
          if (referenceUpdateSuccess) {
            console.log('✅ Thread synth reference updated in Supabase:', member.id);
          } else {
            console.error('❌ Failed to update thread synth reference in Supabase');
          }
        }
      } catch (error) {
        console.error('❌ Failed to persist team member updates to Supabase:', error);
        // Keep the local updates even if Supabase update fails
      }
    }
  }, [activeThreadId, user, customSynths, threadSynths, updateSynth, updateThreadSynthReference]);
  
  // Original handleSendMessage for fallback
  const originalHandleSendMessage = React.useCallback(async (displayContent: string, fullContent: string, attachedImage?: any) => {
    if (teamMembers.length === 0) return;

    // Check if API key is provided
    if (!isApiKeyValid) {
      console.error('❌ No OpenAI API key provided');
      // Add an error message to the chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: '⚠️ Please enter your OpenAI API key in the header to enable AI responses.',
        sender: 'ai',
        timestamp: new Date(),
        aiEmployee: {
          id: 'system',
          name: 'System',
          role: 'System',
          profileImage: '/coai-logo.png',
          model: 'system',
        },
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Add user message using DISPLAY content for chat history
    const userMessageId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      content: displayContent || (attachedImage ? `Shared an image: ${attachedImage.name}` : ''),
      sender: 'user',
      timestamp: new Date(),
      ...(attachedImage && { image: attachedImage }),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    // Save user message immediately to Supabase
    if (user && adapter && activeThreadId) {
      try {
        await adapter.createMessage(newUserMessage, activeThreadId);
        console.log('💾 User message saved to Supabase:', newUserMessage.id);
      } catch (error) {
        console.error('❌ Failed to save user message:', error);
      }
    }

    // Prepare initial chat history (up to the user's message) - use display content for history
    let chatHistory = messages
      .filter(msg => !msg.id.startsWith('demo'))
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        ...(msg.image && { image: msg.image }), // Include image data if present
      }));

    // Add the new user message to history using DISPLAY content
    chatHistory.push({
      role: 'user',
      content: displayContent || (attachedImage ? `Shared an image: ${attachedImage.name}` : ''),
      ...(attachedImage && { image: attachedImage }),
    });

    // 🚨 IMPORTANT: Create a separate AI chat history that uses FULL content for processing
    const aiChatHistory = [...chatHistory];
    // Replace the last user message with the full content for AI processing
    aiChatHistory[aiChatHistory.length - 1] = {
      role: 'user',
      content: fullContent || (attachedImage ? `Shared an image: ${attachedImage.name}` : ''),
      ...(attachedImage && { image: attachedImage }),
    };

    // 🚨 DEBUG: Log the content being sent to AI - use FULL content
    console.log('🚨 [DOCUMENT CONTEXT DEBUG] Display content for chat history:', displayContent);
    console.log('🚨 [DOCUMENT CONTEXT DEBUG] Full content being sent to AI:', fullContent);
    console.log('🚨 [DOCUMENT CONTEXT DEBUG] Full content contains document context:', fullContent.includes('<!-- DOCUMENT_CONTEXT:'));
    if (fullContent.includes('<!-- DOCUMENT_CONTEXT:')) {
      const contextMatch = fullContent.match(/<!-- DOCUMENT_CONTEXT:[\s\S]*?-->/);
      if (contextMatch) {
        console.log('🚨 [DOCUMENT CONTEXT DEBUG] Document context found:', contextMatch[0].substring(0, 200) + '...');
      }
    }

    // Parse mentions from the FULL message to determine which team members should respond
    // Updated regex to capture employee names that are valid mentions
    const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$)/g;
    const mentionedMemberIds: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(fullContent)) !== null) {
      const mentionName = match[1];
      
      // Check if this mention name matches any team member
      const matchingMember = teamMembers.find(member => 
        member.name.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (matchingMember) {
        mentionedMemberIds.push(matchingMember.id);
      }
    }

    // Filter team members based on mentions
    const baseActiveMembers = mentionedMemberIds.length > 0 
      ? teamMembers.filter(member => mentionedMemberIds.includes(member.id))
      : teamMembers; // If no mentions, everyone responds
    
    // 🎲 RANDOMIZE the order of team members for each new conversation
    const activeTeamMembers = randomizeTeamOrder(baseActiveMembers);
    
    // Set loading state to show spinner while waiting for stream to start
    setIsWaitingForStream(true);

    // Process active team members sequentially with human-like delays
    for (let i = 0; i < activeTeamMembers.length; i++) {
      const member = activeTeamMembers[i];
      // Check both employees and customSynths arrays
      const employee = employees.find(emp => emp.id === member.id) || customSynths.find(synth => synth.id === member.id);
      if (!employee) continue;

      // Add delay between team member responses (except for the first one)
      if (i > 0) {
        const betweenDelay = HumanTiming.getBetweenResponsesDelay();
        await sleep(betweenDelay);
      }

      // Prepare message ID for this AI employee, but don't add to UI yet
      const messageId = `${Date.now()}-${member.id}-${i}`;
      let messageAddedToUI = false;
      
      // Add delay before starting to type (simulates reading/thinking)
      const startDelay = HumanTiming.getStartDelay();
      await sleep(startDelay);

      try {
        // Use the original system prompt
        const finalPrompt = member.systemPrompt || `You are a ${employee.role}. Always respond according to your role.`;
        
        // 🚨 DEBUG: Log the system prompt construction
        console.log(`🚨 [PROMPT DEBUG] ${employee.name}:`);
        console.log(`🚨 [PROMPT DEBUG] - member.systemPrompt: "${member.systemPrompt}"`);
        console.log(`🚨 [PROMPT DEBUG] - finalPrompt: "${finalPrompt}"`);

        // 🚨 FRONTEND DEBUG: Track when each AI call is made
        const callTimestamp = new Date().toISOString();
        console.log(`🚨 [FRONTEND] ${callTimestamp} - Making API call for ${employee.name} (${i + 1}/${activeTeamMembers.length})`);
        console.log(`🚨 [FRONTEND] Chat history length: ${chatHistory.length} messages`);
        console.log(`🚨 [FRONTEND] Previous AI responses in history: ${chatHistory.filter(msg => msg.role === 'assistant').length}`);
        
        const response = await streamChat(
          aiChatHistory,
          employee.role,
          member.model,
          finalPrompt,
          employee.name,
          openaiApiKey
        );

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let accumulatedContent = '';
        let streamCompleted = false;

        // Process stream with human-like delays
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') {
                if (data === '[DONE]') {
                  streamCompleted = true;
                }
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                
                // Check for stream completion first
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].finish_reason) {
                  streamCompleted = true;
                  break;
                }
                
                // Extract content from OpenAI format
                const content = parsed.choices?.[0]?.delta?.content || parsed.content;
                if (content) {
                  accumulatedContent += content;
                  
                  // Add message to UI only when we first receive content
                  if (!messageAddedToUI) {
                    // Hide the waiting spinner as soon as we get the first AI response
                    setIsWaitingForStream(false);
                    
                    const aiMessage: ChatMessage = {
                      id: messageId,
                      content: accumulatedContent,
                      sender: 'ai' as const,
                      timestamp: new Date(),
                      isLoading: true,
                      aiEmployee: {
                        id: employee.id,
                        name: employee.name,
                        role: employee.role,
                        profileImage: employee.profileImage,
                        model: member.model,
                      },
                    };
                    setMessages(prev => [...prev, aiMessage]);
                    messageAddedToUI = true;
                  } else {
                    // Update the message content in real-time
                    setMessages(prev => prev.map(msg =>
                      msg.id === messageId
                        ? {
                            ...msg,
                            content: accumulatedContent,
                            isLoading: true, // Keep loading true to show typing indicator
                          }
                        : msg
                    ));
                  }
                }

                // Legacy completion check (backup)
                if (parsed.done) {
                  streamCompleted = true;
                  break;
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
          
          // Exit main loop if stream completed
          if (streamCompleted) {
            break;
          }
        }

        // Response completed successfully

        // Mark the message as complete and add to chat history for next AI
        if (accumulatedContent.trim()) {
          aiChatHistory.push({
            role: 'assistant',
            content: accumulatedContent,
          });
        }

        // Mark the message as complete (only if it was added to UI)
        if (messageAddedToUI) {
          const completedMessage: ChatMessage = {
            id: messageId,
            content: accumulatedContent,
            sender: 'ai' as const,
            timestamp: new Date(),
            isLoading: false,
            aiEmployee: {
              id: employee.id,
              name: employee.name,
              role: employee.role,
              profileImage: employee.profileImage,
              model: member.model,
            },
          };
          
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? completedMessage
              : msg
          ));
          
          // Save AI message immediately to Supabase
          if (user && adapter && activeThreadId) {
            try {
              await adapter.createMessage(completedMessage, activeThreadId);
              console.log('💾 AI message saved to Supabase:', completedMessage.id);
            } catch (error) {
              console.error('❌ Failed to save AI message:', error);
            }
          }
        }

      } catch (error) {
        console.error(`❌ [${employee.name}] Error in chat stream:`, error);
        // Remove the message on error (only if it was added to UI)
        if (messageAddedToUI) {
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
        }
      }
    }

    // Ensure loading state is cleared when all processing is done
    setIsWaitingForStream(false);
  }, [messages, teamMembers, employees, customSynths, isApiKeyValid, openaiApiKey]);



  // Enhanced handleSendMessage with Natural Team Dynamics
  const handleSendMessage = React.useCallback(async (messageData: { display: string; full: string } | string, attachedImage?: any) => {
    console.log(`🚨 [HANDLER DEBUG] isNaturalDynamicsEnabled: ${isNaturalDynamicsEnabled}`);
    console.log(`🚨 [HANDLER DEBUG] teamMembers.length: ${teamMembers.length}`);
    console.log(`🚨 [HANDLER DEBUG] isApiKeyValid: ${isApiKeyValid}`);
    
    // Handle both old string format and new object format for backward compatibility
    const displayContent = typeof messageData === 'string' ? messageData : messageData.display;
    const fullContent = typeof messageData === 'string' ? messageData : messageData.full;
    
    // 🚨 DEBUG: Track document context in Layout
    console.log('🚨 [DOCUMENT DEBUG] === LAYOUT HANDLER DEBUG ===');
    console.log('🚨 [DOCUMENT DEBUG] Display content received in Layout:', displayContent.substring(0, 200) + '...');
    console.log('🚨 [DOCUMENT DEBUG] Full content received in Layout:', fullContent.substring(0, 200) + '...');
    console.log('🚨 [DOCUMENT DEBUG] Display content contains DOCUMENT_CONTEXT:', displayContent.includes('<!-- DOCUMENT_CONTEXT:'));
    console.log('🚨 [DOCUMENT DEBUG] Full content contains DOCUMENT_CONTEXT:', fullContent.includes('<!-- DOCUMENT_CONTEXT:'));
    
    // Debug: Log the combined employees array being passed to dynamics
    const combinedEmployees = [...employees, ...customSynths];
    console.log(`🔍 [EMPLOYEES DEBUG] Total employees being passed to dynamics: ${combinedEmployees.length}`);
    console.log(`🔍 [EMPLOYEES DEBUG] Base employees: ${employees.length}`);
    console.log(`🔍 [EMPLOYEES DEBUG] Custom synths: ${customSynths.length}`);
    console.log(`🔍 [EMPLOYEES DEBUG] Custom synths IDs:`, customSynths.map(s => ({ id: s.id, name: s.name })));
    console.log(`🔍 [EMPLOYEES DEBUG] Team member IDs:`, teamMembers.map(m => ({ id: m.id, name: m.name })));
    
    // Use sequential message handling
    console.log('🔄 Using sequential message handling');
    await originalHandleSendMessage(displayContent, fullContent, attachedImage);
    
    // Messages are saved immediately when created - no batch saving needed
  }, [
    teamMembers,
    employees,
    customSynths,
    messages,
    openaiApiKey,
    isApiKeyValid,
    setMessages,
    setIsWaitingForStream,
    originalHandleSendMessage
  ]);

  // Handle AI continuation (spacebar trigger)
  const handleAIContinue = React.useCallback(async () => {
    if (teamMembers.length === 0) {
      return;
    }

    // Check if API key is provided
    if (!isApiKeyValid) {
      console.error('❌ No OpenAI API key provided for AI continuation');
      // Add an error message to the chat
      const errorMessage: ChatMessage = {
        id: `error-continue-${Date.now()}`,
        content: '⚠️ Please enter your OpenAI API key in the header to enable AI responses.',
        sender: 'ai',
        timestamp: new Date(),
        aiEmployee: {
          id: 'system',
          name: 'System',
          role: 'System',
          profileImage: '/coai-logo.png',
          model: 'system',
        },
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Prepare chat history from current messages
    let chatHistory = messages
      .filter(msg => !msg.id.startsWith('demo'))
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        ...(msg.image && { image: msg.image }), // Include image data if present
      }));

    // Add a system message to indicate this is a continuation
    chatHistory.push({
      role: 'user',
      content: '[Continue the conversation - explore the topic further and share your thoughts among the team]'
    });

    // All team members respond in AI continuation (no filtering by mentions)
    // 🎲 RANDOMIZE the order of team members for AI continuation
    const activeTeamMembers = randomizeTeamOrder(teamMembers);
    
    console.log(`🎲 [AI CONTINUE - RANDOM ORDER] Team members will respond in this order:`, 
      activeTeamMembers.map(m => m.name).join(' → '));

    // Set loading state to show spinner while waiting for stream to start
    setIsWaitingForStream(true);

    // Process team members sequentially with human-like delays
    for (let i = 0; i < activeTeamMembers.length; i++) {
      const member = activeTeamMembers[i];
      // Check both employees and customSynths arrays
      const employee = employees.find(emp => emp.id === member.id) || customSynths.find(synth => synth.id === member.id);
      if (!employee) continue;

      // Add delay between team member responses (except for the first one)
      if (i > 0) {
        const betweenDelay = HumanTiming.getBetweenResponsesDelay();
        await sleep(betweenDelay);
      }

      // Prepare message ID for this AI employee, but don't add to UI yet
      const messageId = `${Date.now()}-continue-${member.id}-${i}`;
      let messageAddedToUI = false;
      
      // Add delay before starting to type (simulates reading/thinking)
      const startDelay = HumanTiming.getStartDelay();
      await sleep(startDelay);

      try {
        // Use original system prompt for AI continuation
        const continuationPrompt = member.systemPrompt ? 
          `${member.systemPrompt}\n\nCONTINUATION CONTEXT: The team is naturally continuing their conversation. Build upon what has been discussed and share your perspective on how to take this further. Be authentic to your role and personality.` :
          `You are a ${employee.role}. The team is continuing their conversation naturally. Build upon what has been discussed and add your unique perspective.`;

        // 🚨 FRONTEND DEBUG: Track AI continuation calls
        const continuationCallTimestamp = new Date().toISOString();
        console.log(`🚨 [AI CONTINUE] ${continuationCallTimestamp} - Making API call for ${employee.name} (${i + 1}/${activeTeamMembers.length})`);
        console.log(`🚨 [AI CONTINUE] Chat history length: ${chatHistory.length} messages`);
        console.log(`🚨 [AI CONTINUE] Previous AI responses in history: ${chatHistory.filter(msg => msg.role === 'assistant').length}`);
        
        const response = await streamChat(
          chatHistory,
          employee.role,
          member.model,
          continuationPrompt,
          employee.name,
          openaiApiKey
        );

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let accumulatedContent = '';
        let streamCompleted = false;

        // Process stream with human-like delays
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') {
                if (data === '[DONE]') {
                  streamCompleted = true;
                }
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                
                // Check for stream completion first
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].finish_reason) {
                  streamCompleted = true;
                  break;
                }
                
                // Extract content from OpenAI format
                const content = parsed.choices?.[0]?.delta?.content || parsed.content;
                if (content) {
                  accumulatedContent += content;
                  
                  // Add message to UI only when we first receive content
                  if (!messageAddedToUI) {
                    // Hide the waiting spinner as soon as we get the first AI response
                    setIsWaitingForStream(false);
                    
                    const aiMessage: ChatMessage = {
                      id: messageId,
                      content: accumulatedContent,
                      sender: 'ai' as const,
                      timestamp: new Date(),
                      isLoading: true,
                      aiEmployee: {
                        id: employee.id,
                        name: employee.name,
                        role: employee.role,
                        profileImage: employee.profileImage,
                        model: member.model,
                      },
                    };
                    setMessages(prev => [...prev, aiMessage]);
                    messageAddedToUI = true;
                  } else {
                    // Update the message content in real-time
                    setMessages(prev => prev.map(msg =>
                      msg.id === messageId
                        ? {
                            ...msg,
                            content: accumulatedContent,
                            isLoading: true, // Keep loading true to show typing indicator
                          }
                        : msg
                    ));
                  }
                }

                // Legacy completion check (backup)
                if (parsed.done) {
                  streamCompleted = true;
                  break;
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
          
          // Exit main loop if stream completed
          if (streamCompleted) {
            break;
          }
        }

        // Mark the message as complete and add to chat history for next AI
        if (accumulatedContent.trim()) {
          chatHistory.push({
            role: 'assistant',
            content: accumulatedContent,
          });
        }

        // Mark the message as complete (only if it was added to UI)
        if (messageAddedToUI) {
          const completedMessage: ChatMessage = {
            id: messageId,
            content: accumulatedContent,
            sender: 'ai' as const,
            timestamp: new Date(),
            isLoading: false,
            aiEmployee: {
              id: employee.id,
              name: employee.name,
              role: employee.role,
              profileImage: employee.profileImage,
              model: member.model,
            },
          };
          
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? completedMessage
              : msg
          ));
          
          // Save AI message immediately to Supabase
          if (user && adapter && activeThreadId) {
            try {
              await adapter.createMessage(completedMessage, activeThreadId);
              console.log('💾 AI continuation message saved to Supabase:', completedMessage.id);
            } catch (error) {
              console.error('❌ Failed to save AI continuation message:', error);
            }
          }
        }

      } catch (error) {
        console.error(`❌ [AI Continue] [${employee.name}] Error in chat stream:`, error);
        // Remove the message on error (only if it was added to UI)
        if (messageAddedToUI) {
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
        }
      }
    }

    // Ensure loading state is cleared when all processing is done
    setIsWaitingForStream(false);
  }, [messages, teamMembers, employees, customSynths, isApiKeyValid, openaiApiKey]);

  // Utility function to randomize team member order
  const randomizeTeamOrder = React.useCallback((members: TeamMember[]): TeamMember[] => {
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Team management handlers
  const handleSelectTeam = React.useCallback(async (teamId: string) => {
    // Switch to the new thread/chat (no need to save - messages are saved immediately)
    if (adapter) {
      try {
        // Since we're using threads as "teams" in the UI, teamId is actually threadId
        await adapter.setActiveThreadId(teamId);
        setActiveThreadId(teamId);
        
        const selectedThread = teams.find(team => team.id === teamId);
        if (selectedThread) {
          setMessages(selectedThread.messages);
          // Don't set team members here - let the thread synths effect handle it
        }
        
        console.log('✅ Switched to thread:', teamId);
      } catch (error) {
        console.error('Failed to switch thread:', error);
      }
    } else {
      // For non-authenticated users, just switch locally
      setActiveThreadId(teamId);
      const selectedThread = teams.find(team => team.id === teamId);
      if (selectedThread) {
        setTeamMembers(selectedThread.members);
        setMessages(selectedThread.messages);
      }
    }
  }, [teams, adapter]);

  const handleEditTeamName = React.useCallback(async (teamId: string, newName: string) => {
    // Update local state immediately for instant UI feedback
    setTeams(prev => {
      const updatedTeams = prev.map(team => 
        team.id === teamId ? { ...team, name: newName } : team
      );
      saveThreadsCache(updatedTeams); // Update cache with new name
      return updatedTeams;
    });
    
    // Persist to Supabase asynchronously
    if (user && adapter) {
      try {
        await adapter.updateThread(teamId, { title: newName });
        console.log('✅ Thread name updated in Supabase:', teamId, newName);
      } catch (error) {
        console.error('❌ Failed to update thread name in Supabase:', error);
        // Could add user notification here if needed
      }
    }
  }, [user, adapter]);

  // Create a new CHAT/THREAD 
  const handleCreateNewChat = React.useCallback(async () => {
    // Prevent multiple clicks
    if (isWaitingForStream) return;
    
    if (user && adapter) {
      try {
        // Generate optimistic thread data and add to UI immediately
        const optimisticThreadId = `thread-${Date.now()}`;
        const optimisticThreadTitle = `Chat ${new Date().toLocaleString()}`;
        
        const newThreadAsTeam: Team = {
          id: optimisticThreadId,
          name: optimisticThreadTitle,
          members: [...teamMembers], // Copy current team members
          messages: [], // Start fresh
          createdAt: new Date(),
          isActive: true,
        };
        
        // Add to UI immediately (optimistic update)
        setTeams(prev => {
          const updatedTeams = [newThreadAsTeam, ...prev];
          saveThreadsCache(updatedTeams); // Update cache with optimistic thread
          return updatedTeams;
        });
        setActiveThreadId(optimisticThreadId);
        setMessages([]);
        
        // Create thread in Supabase asynchronously
        try {
          const realThreadId = await adapter.createThread(optimisticThreadTitle);
          
          // Update with real thread ID from Supabase atomically
          setTeams(prev => {
            const updatedTeams = prev.map(thread => 
              thread.id === optimisticThreadId 
                ? { ...thread, id: realThreadId }
                : thread
            );
            saveThreadsCache(updatedTeams); // Update cache with real ID
            return updatedTeams;
          });
          
          // Update active thread ID to real ID
          setActiveThreadId(realThreadId);
          
          // Also update Supabase active thread
          await adapter.setActiveThreadId(realThreadId);
          
          // If we have team members, save them to the thread
          if (teamMembers.length > 0) {
            try {
              for (const member of teamMembers) {
                const isCustomSynth = customSynths.some(synth => synth.id === member.id);
                
                const synthReference: COAITeamSynthReference = {
                  synthId: member.id,
                  isCustom: isCustomSynth,
                  metadata: {
                    model: member.model,
                    systemPrompt: member.systemPrompt,
                    originalMemberId: member.id,
                    name: member.name,
                    role: member.role,
                    profileImage: member.profileImage
                  }
                };
                
                await addSynthToThread(isCustomSynth ? member.id : null, synthReference);
              }
              console.log('✅ Team members saved to new thread:', teamMembers.length);
            } catch (error) {
              console.error('❌ Failed to save team members to new thread:', error);
            }
          }
          
          console.log('✅ Thread created in Supabase:', realThreadId);
          console.log('🔍 DEBUG: Thread state after creation - optimistic:', optimisticThreadId, '-> real:', realThreadId);
          
          // Trigger a fresh data load to ensure sync
          setTimeout(async () => {
            try {
              const freshThreads = await adapter.getThreads();
              setTeams(prev => {
                // Only update if we don't have newer optimistic updates
                const hasNewerOptimistic = prev.some(t => t.id.startsWith('thread-') && t.id !== optimisticThreadId);
                if (!hasNewerOptimistic) {
                  console.log('🔄 Refreshing with latest Supabase data after thread creation');
                  saveThreadsCache(freshThreads);
                  return freshThreads;
                }
                return prev;
              });
            } catch (error) {
              console.warn('Failed to refresh threads after creation:', error);
            }
          }, 1000); // Small delay to ensure Supabase has processed the creation
        } catch (error) {
          console.error('❌ Failed to create thread in Supabase:', error);
          console.log('🔍 DEBUG: Thread state after creation - optimistic:', optimisticThreadId, '-> real: pending (error)');
          // Keep optimistic data - thread will be created when first message is sent
        }
        
        console.log('💬 New chat thread created instantly with team members:', teamMembers.length);
      } catch (error) {
        console.error('Failed to create new chat:', error);
      }
    } else {
      // For unauthenticated users, just clear messages locally
      setMessages([]);
      console.log('💬 Created new local chat with team members:', teamMembers.length);
    }
  }, [user, adapter, teamMembers, teams.length, isWaitingForStream, saveThreadsCache]);



  const handleClearChat = React.useCallback(() => {
    // Clear messages from UI
    setMessages([]);
    
    // Clear messages from active team
    if (activeThreadId) {
      setTeams(prev => prev.map(team => 
        team.id === activeThreadId 
          ? { ...team, messages: [] }
          : team
      ));
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
        
        // Update active thread in Supabase
        if (user && adapter) {
          try {
                         await adapter.setActiveThreadId(remainingTeams[0].id);
          } catch (error) {
            console.error('❌ Failed to update active thread:', error);
          }
        }
      } else {
        // No threads left, clear everything
        setActiveThreadId(null);
        setTeamMembers([]);
        setMessages([]);
        
        // Clear active thread in Supabase
        if (user && adapter) {
          try {
                         await adapter.setActiveThreadId(null);
          } catch (error) {
            console.error('❌ Failed to clear active thread:', error);
          }
        }
      }
    }
    
    // Delete thread from Supabase
    if (user && adapter) {
      try {
        await adapter.deleteThread(teamId);
        console.log('✅ Thread deleted from Supabase:', teamId);
      } catch (error) {
        console.error('❌ Failed to delete thread from Supabase:', error);
        // Could add user notification here if needed
      }
    }
  }, [teams, activeThreadId, setActiveThreadId, setTeamMembers, setMessages, setTeams, user, adapter, saveThreadsCache]);



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
        event.preventDefault();
        
        const now = Date.now();
        // Reset count if more than 3 seconds have passed since last press
        if (now - lastGlobalSpacebarPress > 3000) {
          setGlobalSpacebarCount(1);
        } else {
          setGlobalSpacebarCount(prev => prev + 1);
        }
        setLastGlobalSpacebarPress(now);
        
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
        onClearChat={handleClearChat}
        hasMessages={messages.length > 0}
        isLoadingData={isLoadingData}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {!isBrowserCollapsed && (
          <div className="w-[30%] flex-shrink-0">
            <BrowserPanel
              employees={employees}
              customSynths={customSynths}
              onSelectEmployee={handleSelectEmployee}
              onQuickAdd={handleAddToThread}
              onQuickAddTeam={handleQuickAddToThread}
              onSelectTeam={handleSelectPremadeTeam}
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
                team={selectedPremadeTeam}
                allEmployees={employees}
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
            employees={[...employees, ...customSynths]}
            teams={teams}
            activeThreadId={activeThreadId}
            onSelectTeam={handleSelectTeam}
            onEditTeamName={handleEditTeamName}
            onCreateChat={handleCreateNewChat}
            onDeleteTeam={handleDeleteTeam}
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
        availableSynths={employees}
        customSynths={customSynths}
        team={teamToEdit}
      />
    </div>
  );
};

export default Layout;