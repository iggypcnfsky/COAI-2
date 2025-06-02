/**
 * Utility functions for normalizing data in the store
 */

/**
 * Normalizes an array of entities into a record with IDs as keys
 * @param entities Array of entities with id property
 * @param key The property name to use as the key in the resulting record (default: 'id')
 * @returns Record with entity IDs as keys and entities as values
 */
export function normalizeArray<T extends { [key: string]: any }>(
  array: T[],
  key: keyof T = 'id' as keyof T
): Record<string, T> {
  return array.reduce((acc, item) => {
    acc[String(item[key])] = item;
    return acc;
  }, {} as Record<string, T>);
}

/**
 * Extracts IDs from an array of entities
 * @param entities Array of entities with id property
 * @returns Array of entity IDs
 */
export function extractIds<T extends { id: string }>(entities: T[]): string[] {
  return entities.map(entity => entity.id);
}

/**
 * Denormalizes a record of entities back into an array
 * @param normalizedEntities Record with entity IDs as keys and entities as values
 * @returns Array of entities
 */
export function denormalizeRecord<T>(normalizedEntities: Record<string, T> | null | undefined): T[] {
  if (!normalizedEntities) {
    return [];
  }
  return Object.values(normalizedEntities);
}

/**
 * Denormalizes a specific subset of entities by ID
 * @param normalizedEntities Record with entity IDs as keys and entities as values
 * @param ids Array of entity IDs to denormalize
 * @returns Array of entities
 */
export function denormalizeByIds<T>(normalizedEntities: Record<string, T> | null | undefined, ids: string[]): T[] {
  if (!normalizedEntities || !ids) {
    return [];
  }
  return ids.map(id => normalizedEntities[id]).filter(Boolean);
}

/**
 * Adds or updates an entity in a normalized record
 * @param state Current normalized record
 * @param entity Entity to add or update
 * @returns Updated normalized record
 */
export function upsertEntity<T extends { id: string }>(
  state: Record<string, T>,
  entity: T
): Record<string, T> {
  return {
    ...state,
    [entity.id]: entity,
  };
}

/**
 * Adds or updates multiple entities in a normalized record
 * @param state Current normalized record
 * @param entities Entities to add or update
 * @returns Updated normalized record
 */
export function upsertEntities<T extends { id: string }>(
  state: Record<string, T>,
  entities: T[]
): Record<string, T> {
  const updates = normalizeArray(entities, 'id');
  return {
    ...state,
    ...updates,
  };
}

/**
 * Removes an entity from a normalized record
 * @param state Current normalized record
 * @param id ID of the entity to remove
 * @returns Updated normalized record
 */
export function removeEntity<T>(
  state: Record<string, T>,
  id: string
): Record<string, T> {
  const { [id]: removed, ...rest } = state;
  return rest;
}

/**
 * Removes multiple entities from a normalized record
 * @param state Current normalized record
 * @param ids IDs of the entities to remove
 * @returns Updated normalized record
 */
export function removeEntities<T>(
  state: Record<string, T>,
  ids: string[]
): Record<string, T> {
  return Object.entries(state).reduce(
    (acc, [key, value]) => {
      if (!ids.includes(key)) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, T>
  );
}

/**
 * Adds an ID to a relationship array
 * @param state Current relationship record
 * @param parentId Parent entity ID
 * @param childId Child entity ID to add
 * @returns Updated relationship record
 */
export function addRelationship(
  state: Record<string, string[]>,
  parentId: string,
  childId: string
): Record<string, string[]> {
  const existingRelationships = state[parentId] || [];
  
  // Only add if not already present
  if (existingRelationships.includes(childId)) {
    return state;
  }
  
  return {
    ...state,
    [parentId]: [...existingRelationships, childId],
  };
}

/**
 * Removes an ID from a relationship array
 * @param state Current relationship record
 * @param parentId Parent entity ID
 * @param childId Child entity ID to remove
 * @returns Updated relationship record
 */
export function removeRelationship(
  state: Record<string, string[]>,
  parentId: string,
  childId: string
): Record<string, string[]> {
  const existingRelationships = state[parentId] || [];
  
  if (!existingRelationships.includes(childId)) {
    return state;
  }
  
  return {
    ...state,
    [parentId]: existingRelationships.filter(id => id !== childId),
  };
}

/**
 * Sets the relationships for a parent entity
 * @param state Current relationship record
 * @param parentId Parent entity ID
 * @param childIds Array of child entity IDs
 * @returns Updated relationship record
 */
export function setRelationships(
  state: Record<string, string[]>,
  parentId: string,
  childIds: string[]
): Record<string, string[]> {
  return {
    ...state,
    [parentId]: childIds,
  };
}

/**
 * Removes all relationships for a parent entity
 * @param state Current relationship record
 * @param parentId Parent entity ID
 * @returns Updated relationship record
 */
export function removeAllRelationships(
  state: Record<string, string[]>,
  parentId: string
): Record<string, string[]> {
  const { [parentId]: removed, ...rest } = state;
  return rest;
}

/**
 * Combines a record with new items, either replacing or merging with existing items
 * @param existingRecord The existing record to update
 * @param newItems The new items to add (as an array)
 * @param key The key property to use for normalizing (default: 'id')
 * @param merge Whether to merge properties of existing items (default: false)
 * @returns A new record with the combined items
 */
export function addToRecord<T extends { [key: string]: any }>(
  existingRecord: Record<string, T>,
  newItems: T[],
  key: keyof T = 'id' as keyof T,
  merge = false
): Record<string, T> {
  const newRecord = { ...existingRecord };
  
  newItems.forEach((item) => {
    const itemKey = String(item[key]);
    
    if (merge && newRecord[itemKey]) {
      // Merge with existing item
      newRecord[itemKey] = { ...newRecord[itemKey], ...item };
    } else {
      // Replace or add new item
      newRecord[itemKey] = item;
    }
  });
  
  return newRecord;
}

/**
 * Removes items from a record by their keys
 * @param record The record to update
 * @param keys Array of keys to remove
 * @returns A new record without the specified keys
 */
export function removeFromRecord<T>(
  record: Record<string, T>,
  keys: string[]
): Record<string, T> {
  return Object.entries(record).reduce(
    (acc, [key, value]) => {
      if (!keys.includes(key)) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, T>
  );
}

/**
 * Updates a specific item in a record
 * @param record The record to update
 * @param key The key of the item to update
 * @param updates Partial updates to apply to the item
 * @returns A new record with the updated item
 */
export function updateInRecord<T>(
  record: Record<string, T>,
  key: string,
  updates: Partial<T>
): Record<string, T> {
  if (!record[key]) return record;
  
  return {
    ...record,
    [key]: {
      ...record[key],
      ...updates,
    },
  };
}

/**
 * Filters a record based on a predicate function
 * @param record The record to filter
 * @param predicate Function that determines whether to keep each entry
 * @returns A new filtered record
 */
export function filterRecord<T>(
  record: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> {
  return Object.entries(record).reduce(
    (acc, [key, value]) => {
      if (predicate(value, key)) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, T>
  );
} 