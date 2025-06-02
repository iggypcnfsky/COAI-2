import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { COAISynthData } from '../../types';

/**
 * Hook to access and manage synths
 */
export function useSynths() {
  // Access the store directly for synths data and actions
  const synths = useAppStore((state) => state.entities.synths);
  const selectedSynthId = useAppStore((state) => state.ui.selectedSynthId);
  const isLoading = useAppStore((state) => state.ui.loadingStates.fetchSynths);
  
  // Get actions from store
  const fetchSynths = useAppStore((state) => state.fetchSynths);
  const getSynth = useAppStore((state) => state.getSynth);
  const createSynth = useAppStore((state) => state.createSynth);
  const updateSynth = useAppStore((state) => state.updateSynth);
  const deleteSynth = useAppStore((state) => state.deleteSynth);
  const selectSynth = useAppStore((state) => state.selectSynth);
  
  // Fetch synths on mount
  useEffect(() => {
    fetchSynths();
  }, [fetchSynths]);
  
  // Get synth by ID (with caching)
  const getSynthById = useCallback(async (id: string) => {
    return getSynth(id);
  }, [getSynth]);
  
  // Create a new synth
  const createNewSynth = useCallback(async (synthData: COAISynthData) => {
    return createSynth(synthData);
  }, [createSynth]);
  
  // Update an existing synth
  const updateExistingSynth = useCallback(async (id: string, updates: Partial<COAISynthData>) => {
    return updateSynth(id, updates);
  }, [updateSynth]);
  
  // Delete a synth
  const deleteExistingSynth = useCallback(async (id: string) => {
    return deleteSynth(id);
  }, [deleteSynth]);
  
  // Select a synth
  const selectActiveSynth = useCallback((id: string | null) => {
    selectSynth(id);
  }, [selectSynth]);
  
  // Get all synths as an array
  const synthsList = useMemo(() => {
    return Object.values(synths);
  }, [synths]);
  
  // Get the currently selected synth
  const selectedSynth = useMemo(() => {
    return selectedSynthId ? synths[selectedSynthId] : null;
  }, [synths, selectedSynthId]);
  
  // Return the synths API
  return {
    // Data
    synths: synthsList,
    selectedSynth,
    isLoading,
    
    // Actions
    getSynth: getSynthById,
    createSynth: createNewSynth,
    updateSynth: updateExistingSynth,
    deleteSynth: deleteExistingSynth,
    selectSynth: selectActiveSynth,
    refreshSynths: fetchSynths,
  };
}

export default useSynths; 