import { StateCreator } from 'zustand';
import { RootState } from '../../types/store';
import { COAITeam, COAITeamData, COAITeamSynth, COAITeamSynthReference } from '../../types';
import { normalizeArray, removeEntity, addRelationship, removeRelationship, removeAllRelationships } from '../../lib/utils/normalization';
import { supabase } from '../../lib/supabase';
import { LoadingStateKey } from '../../types/store';
import { DataService } from '../../lib/services/dataService';

export interface TeamsState {
  // Actions
  fetchTeams: () => Promise<void>;
  getTeam: (id: string) => Promise<COAITeam | null>;
  createTeam: (teamData: COAITeamData) => Promise<COAITeam>;
  updateTeam: (id: string, updates: Partial<COAITeamData>) => Promise<COAITeam>;
  deleteTeam: (id: string) => Promise<void>;
  selectTeam: (id: string | null) => void;
  
  // Team-Synth relationship actions
  addSynthToTeam: (teamId: string, synthId: string, reference: COAITeamSynthReference) => Promise<void>;
  removeSynthFromTeam: (teamId: string, synthId: string) => Promise<void>;
  getTeamSynths: (teamId: string) => Promise<COAITeamSynth[]>;
  updateTeamSynthReference: (teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>) => Promise<void>;
}

export const createTeamsSlice: StateCreator<
  RootState,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  TeamsState
> = (set, get) => ({
  // Actions
  fetchTeams: async () => {
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.FETCH_TEAMS]: true
        }
      }
    }), false, 'teams/fetchTeams/start');
    
    try {
      // Get public teams and user's private teams if authenticated
      const { session } = get();
      const userId = session?.user?.id;
      
      // Use the DataService to fetch public teams and optionally user's teams
      const teams = await DataService.fetchPublicTeams(userId);
      
      // Normalize teams by ID
      const normalizedTeams = normalizeArray(teams as COAITeam[]);
      
      // Update state with normalized teams
      set((state) => ({
        entities: {
          ...state.entities,
          teams: normalizedTeams
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_TEAMS]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_TEAMS]: null
          }
        }
      }), false, 'teams/fetchTeams/success');
      
      // For each team, fetch team-synth relationships
      for (const team of teams as COAITeam[]) {
        try {
          await get().getTeamSynths(team.id);
        } catch (e) {
          console.error(`Error fetching synths for team ${team.id}:`, e);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_TEAMS]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_TEAMS]: error as Error
          }
        }
      }), false, 'teams/fetchTeams/error');
    }
  },
  
  getTeam: async (id: string) => {
    const { entities } = get();
    
    // Return from cache if available
    if (entities.teams[id]) return entities.teams[id];
    
    try {
      const { data, error } = await supabase
        .from('coai-teams')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      const team = data as COAITeam;
      
      // Update store with fetched team
      set((state) => ({
        entities: {
          ...state.entities,
          teams: {
            ...state.entities.teams,
            [id]: team
          }
        },
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getTeam: null
          }
        }
      }), false, 'teams/getTeam/success');
      
      // Also fetch team-synth relationships
      await get().getTeamSynths(id);
      
      return team;
    } catch (error) {
      console.error(`Error fetching team ${id}:`, error);
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getTeam: error as Error
          }
        }
      }), false, 'teams/getTeam/error');
      return null;
    }
  },
  
  createTeam: async (teamData: COAITeamData) => {
    const { session } = get();
    
    // Set loading state
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.CREATE_TEAM]: true
        }
      }
    }), false, 'teams/createTeam/start');
    
    try {
      // Prepare team data with proper user_id if authenticated
      const teamRecord = {
        user_id: session?.user?.id,
        team_data: {
          ...teamData,
          // Ensure isPublic is included and defaults to true if not provided
          isPublic: teamData.isPublic !== undefined ? teamData.isPublic : true
        }
      };
      
      const { data, error } = await supabase
        .from('coai-teams')
        .insert(teamRecord)
        .select()
        .single();
        
      if (error) throw error;
      
      const newTeam = data as COAITeam;
      
      // Update store with new team
      set((state) => ({
        entities: {
          ...state.entities,
          teams: {
            ...state.entities.teams,
            [newTeam.id]: newTeam
          }
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_TEAM]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_TEAM]: null
          }
        }
      }), false, 'teams/createTeam/success');
      
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_TEAM]: false
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_TEAM]: error as Error
          }
        }
      }), false, 'teams/createTeam/error');
      throw error;
    }
  },
  
  updateTeam: async (id: string, updates: Partial<COAITeamData>) => {
    const { entities } = get();
    
    // Get current team
    const currentTeam = entities.teams[id];
    if (!currentTeam) {
      throw new Error(`Team with id ${id} not found`);
    }
    
    // Apply optimistic update
    const updatedTeamData = {
      ...currentTeam.team_data,
      ...updates,
      // Ensure isPublic is preserved if not explicitly changed
      isPublic: updates.isPublic !== undefined ? updates.isPublic : currentTeam.team_data.isPublic
    };
    
    const updatedTeam = { 
      ...currentTeam,
      team_data: updatedTeamData,
      updated_at: new Date().toISOString() 
    };
    
    set((state) => ({
      entities: {
        ...state.entities,
        teams: {
          ...state.entities.teams,
          [id]: updatedTeam
        }
      }
    }), false, 'teams/updateTeam/optimistic');
    
    try {
      // Prepare update data
      const updateData = {
        updated_at: new Date().toISOString(),
        team_data: updatedTeamData
      };
      
      const { data, error } = await supabase
        .from('coai-teams')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      const serverTeam = data as COAITeam;
      
      // Update store with server data (to ensure consistency)
      set((state) => ({
        entities: {
          ...state.entities,
          teams: {
            ...state.entities.teams,
            [id]: serverTeam
          }
        }
      }), false, 'teams/updateTeam/success');
      
      return serverTeam;
    } catch (error) {
      console.error(`Error updating team ${id}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        entities: {
          ...state.entities,
          teams: {
            ...state.entities.teams,
            [id]: currentTeam
          }
        }
      }), false, 'teams/updateTeam/revert');
      
      throw error;
    }
  },
  
  deleteTeam: async (id: string) => {
    const { entities, relationships } = get();
    
    // Get current team
    const currentTeam = entities.teams[id];
    if (!currentTeam) {
      throw new Error(`Team with id ${id} not found`);
    }
    
    // Apply optimistic update
    set((state) => ({
      entities: {
        ...state.entities,
        teams: removeEntity(state.entities.teams, id)
      },
      relationships: {
        ...state.relationships,
        teamSynths: removeAllRelationships(state.relationships.teamSynths, id)
      }
    }), false, 'teams/deleteTeam/optimistic');
    
    try {
      const { error } = await supabase
        .from('coai-teams')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Success - optimistic update was correct
      
      // If this was the active team, clear that selection
      if (get().ui.activeTeamId === id) {
        set((state) => ({
          ui: {
            ...state.ui,
            activeTeamId: null,
          }
        }), false, 'teams/deleteTeam/clearActiveTeam');
      }
      
    } catch (error) {
      console.error(`Error deleting team ${id}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        entities: {
          ...state.entities,
          teams: {
            ...state.entities.teams,
            [id]: currentTeam
          }
        },
        relationships: {
          ...state.relationships,
          teamSynths: relationships.teamSynths
        }
      }), false, 'teams/deleteTeam/revert');
      
      throw error;
    }
  },
  
  selectTeam: (id: string | null) => {
    set((state) => ({
      ui: {
        ...state.ui,
        activeTeamId: id
      }
    }), false, 'teams/selectTeam');
  },
  
  // Team-Synth relationship actions
  getTeamSynths: async (teamId: string) => {
    try {
      // Use the DataService to fetch team synths
      const teamSynths = await DataService.fetchTeamSynths(teamId);
      
      // Create a list of synth IDs for this team
      const synthIds = teamSynths.map(ts => ts.synth_id).filter(Boolean) as string[];
      
      // Update the relationship in the store
      set((state) => ({
        relationships: {
          ...state.relationships,
          teamSynths: {
            ...state.relationships.teamSynths,
            [teamId]: synthIds
          }
        }
      }), false, 'teams/getTeamSynths/success');
      
      // Load any synth details that aren't already in the store
      const { entities } = get();
      
      for (const synthId of synthIds) {
        if (!entities.synths[synthId]) {
          try {
            await get().getSynth(synthId);
          } catch (e) {
            console.error(`Error fetching synth ${synthId}:`, e);
          }
        }
      }
      
      return teamSynths;
    } catch (error) {
      console.error(`Error fetching synths for team ${teamId}:`, error);
      set((state) => ({
        ui: {
          ...state.ui,
          errors: {
            ...state.ui.errors,
            getTeamSynths: error as Error
          }
        }
      }), false, 'teams/getTeamSynths/error');
      return [];
    }
  },
  
  addSynthToTeam: async (teamId: string, synthId: string, reference: COAITeamSynthReference) => {
    try {
      // Add optimistic update for relationship
      set((state) => ({
        relationships: {
          ...state.relationships,
          teamSynths: addRelationship(state.relationships.teamSynths, teamId, synthId)
        }
      }), false, 'teams/addSynthToTeam/optimistic');
      
      // Create team-synth relationship in database
      const { error } = await supabase
        .from('coai-team-synths')
        .insert({
          team_id: teamId,
          synth_id: synthId,
          synth_reference: reference
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Success - optimistic update was correct
    } catch (error) {
      console.error(`Error adding synth ${synthId} to team ${teamId}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        relationships: {
          ...state.relationships,
          teamSynths: removeRelationship(state.relationships.teamSynths, teamId, synthId)
        }
      }), false, 'teams/addSynthToTeam/revert');
      
      throw error;
    }
  },
  
  removeSynthFromTeam: async (teamId: string, synthId: string) => {
    try {
      // Apply optimistic update for relationship
      set((state) => ({
        relationships: {
          ...state.relationships,
          teamSynths: removeRelationship(state.relationships.teamSynths, teamId, synthId)
        }
      }), false, 'teams/removeSynthFromTeam/optimistic');
      
      // Remove team-synth relationship from database
      const { error } = await supabase
        .from('coai-team-synths')
        .delete()
        .eq('team_id', teamId)
        .eq('synth_id', synthId);
        
      if (error) throw error;
      
      // Success - optimistic update was correct
    } catch (error) {
      console.error(`Error removing synth ${synthId} from team ${teamId}:`, error);
      
      // Revert optimistic update
      set((state) => ({
        relationships: {
          ...state.relationships,
          teamSynths: addRelationship(state.relationships.teamSynths, teamId, synthId)
        }
      }), false, 'teams/removeSynthFromTeam/revert');
      
      throw error;
    }
  },
  
  updateTeamSynthReference: async (teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>) => {
    try {
      // Fetch current reference
      const { data: currentData, error: fetchError } = await supabase
        .from('coai-team-synths')
        .select('synth_reference')
        .eq('team_id', teamId)
        .eq('synth_id', synthId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentReference = currentData.synth_reference;
      
      // Merge with updates
      const updatedReference = {
        ...currentReference,
        ...reference
      };
      
      // Update in database
      const { error: updateError } = await supabase
        .from('coai-team-synths')
        .update({ synth_reference: updatedReference })
        .eq('team_id', teamId)
        .eq('synth_id', synthId);
        
      if (updateError) throw updateError;
      
    } catch (error) {
      console.error(`Error updating reference for synth ${synthId} in team ${teamId}:`, error);
      throw error;
    }
  }
}); 