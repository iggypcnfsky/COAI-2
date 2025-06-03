import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { COAITeamSynthReference } from '../../types';
import { denormalizeRecord } from '../../lib/utils/normalization';

/**
 * Hook for interacting with teams in the application
 */
export function useTeams() {
  // Check if store is initialized to prevent null errors
  const storeExists = useAppStore.getState !== undefined;
  
  if (!storeExists) {
    // Return safe defaults if store is not initialized
    return {
      teams: [],
      activeTeam: null,
      activeTeamId: null,
      selectedSynthId: null,
      activeSynths: [],
      isLoading: false,
      fetchTeams: () => {},
      getTeam: async () => null,
      createTeam: async () => null,
      updateTeam: async () => null,
      deleteTeam: async () => null,
      selectTeam: () => {},
      addSynthToTeam: async () => {},
      removeSynthFromTeam: async () => {},
      getTeamSynths: () => [],
      updateTeamSynthReference: async () => {},
      getTeamSynthsList: () => [],
      addSynthToActiveTeam: async () => {},
      removeSynthFromActiveTeam: async () => {},
      isSynthInActiveTeam: () => false,
    };
  }

  // Select state from the store
  const teams = useAppStore((state) => state.entities.teams);
  const activeTeamId = useAppStore((state) => state.ui.activeTeamId);
  const selectedSynthId = useAppStore((state) => state.ui.selectedSynthId);
  const teamSynthsRelationships = useAppStore((state) => state.relationships.teamSynths);
  const synths = useAppStore((state) => state.entities.synths);
  const isLoading = useAppStore((state) => state.ui.loadingStates.fetchTeams);
  
  // Get authentication state to trigger re-fetch when user logs in
  const session = useAppStore((state) => state.session);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  
  // Select actions from the store
  const fetchTeams = useAppStore((state) => state.fetchTeams);
  const getTeam = useAppStore((state) => state.getTeam);
  const createTeam = useAppStore((state) => state.createTeam);
  const updateTeam = useAppStore((state) => state.updateTeam);
  const deleteTeam = useAppStore((state) => state.deleteTeam);
  const selectTeam = useAppStore((state) => state.selectTeam);
  const addSynthToTeam = useAppStore((state) => state.addSynthToTeam);
  const removeSynthFromTeam = useAppStore((state) => state.removeSynthFromTeam);
  const getTeamSynths = useAppStore((state) => state.getTeamSynths);
  const updateTeamSynthReference = useAppStore((state) => state.updateTeamSynthReference);
  
  // Fetch teams on initial load
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);
  
  // Re-fetch teams when authentication state changes (user logs in/out)
  useEffect(() => {
    console.log('🔍 [TEAMS DEBUG] Authentication state changed, re-fetching teams. isAuthenticated:', isAuthenticated, 'userId:', session?.user?.id);
    fetchTeams();
  }, [isAuthenticated, session?.user?.id, fetchTeams]);
  
  // Convert normalized teams to array
  const teamsList = useMemo(() => {
    return denormalizeRecord(teams);
  }, [teams]);
  
  // Get active team
  const activeTeam = useMemo(() => {
    return activeTeamId ? teams[activeTeamId] : null;
  }, [teams, activeTeamId]);
  
  // Get synths for the active team
  const activeSynths = useMemo(() => {
    if (!activeTeamId || !teamSynthsRelationships[activeTeamId]) {
      return [];
    }
    
    const synthIds = teamSynthsRelationships[activeTeamId];
    return synthIds.map((id) => synths[id]).filter(Boolean);
  }, [activeTeamId, teamSynthsRelationships, synths]);
  
  // Add a synth to the active team
  const addSynthToActiveTeam = useCallback(
    async (synthId: string) => {
      if (!activeTeamId) {
        throw new Error('No active team selected');
      }
      
      const reference: COAITeamSynthReference = {
        synthId,
        isCustom: true,
      };
      
      await addSynthToTeam(activeTeamId, synthId, reference);
    },
    [activeTeamId, addSynthToTeam]
  );
  
  // Remove a synth from the active team
  const removeSynthFromActiveTeam = useCallback(
    async (synthId: string) => {
      if (!activeTeamId) {
        throw new Error('No active team selected');
      }
      
      await removeSynthFromTeam(activeTeamId, synthId);
    },
    [activeTeamId, removeSynthFromTeam]
  );
  
  // Check if a synth is in the active team
  const isSynthInActiveTeam = useCallback(
    (synthId: string) => {
      if (!activeTeamId || !teamSynthsRelationships[activeTeamId]) {
        return false;
      }
      
      return teamSynthsRelationships[activeTeamId].includes(synthId);
    },
    [activeTeamId, teamSynthsRelationships]
  );
  
  // Get synths for a specific team
  const getTeamSynthsList = useCallback((teamId: string) => {
    const synthIds = teamSynthsRelationships[teamId] || [];
    return synthIds.map(id => synths[id]).filter(Boolean);
  }, [teamSynthsRelationships, synths]);
  
  return {
    // State
    teams: teamsList,
    activeTeam,
    activeTeamId,
    selectedSynthId,
    activeSynths,
    isLoading,
    
    // Team actions
    fetchTeams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    
    // Team-Synth relationship actions
    addSynthToTeam,
    removeSynthFromTeam,
    getTeamSynths,
    updateTeamSynthReference,
    getTeamSynthsList,
    
    // Helper methods
    addSynthToActiveTeam,
    removeSynthFromActiveTeam,
    isSynthInActiveTeam,
  };
} 