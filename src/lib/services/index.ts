/**
 * Service Layer Index
 * 
 * This file exports all services and provides helper functions
 * to select the appropriate service based on authentication status.
 */

import { IDataService } from './dataService';
import { directService } from './directService';


import { useAppStore } from '../../stores/appStore';

export function getDataService(): IDataService {
  return directService;
}

/**
 * Initialize the application by fetching public data
 * Call this function during app startup to load all required data
 */
export async function initializeAppData() {
  console.log('🚀 Initializing app data...');
  const store = useAppStore.getState();
  
  try {
    // Fetch public synths and teams in parallel
    await Promise.all([
      store.fetchSynths(),
      store.fetchTeams()
    ]);
    
    console.log('✅ App data initialization complete');
  } catch (error) {
    console.error('❌ Error initializing app data:', error);
  }
}

// Export all services
export { cacheService } from './cacheService';
export { directService } from './directService';
export type { IDataService, DataService } from './dataService';

// Default export the helper function
export default getDataService; 