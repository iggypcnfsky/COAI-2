/**
 * Generates a unique ID for entities
 * @returns A string ID based on current timestamp and random values
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Utility function to ensure isPublic property is properly included in data field
 * when saving to Supabase
 * 
 * @param entityData Object containing entity data
 * @param isPublic Boolean indicating whether the entity should be public
 * @returns Object with data field properly structured for Supabase
 */
export function formatEntityForStorage(entityData: Record<string, any>, isPublic: boolean = true) {
  return {
    ...entityData,
    data: {
      ...entityData.data,
      isPublic,
    }
  };
}

export * from './normalization'; 