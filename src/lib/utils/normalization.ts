/**
 * Utility functions for normalizing data in the store
 */

/**
 * Normalizes an array of entities into a record with IDs as keys
 * @param entities Array of entities with id property
 * @returns Record with entity IDs as keys and entities as values
 */
export function normalizeArray<T extends { id: string }>(entities: T[]): Record<string, T> {
  return entities.reduce((acc, entity) => {
    acc[entity.id] = entity;
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
export function denormalizeRecord<T>(normalizedEntities: Record<string, T>): T[] {
  return Object.values(normalizedEntities);
}

/**
 * Denormalizes a specific subset of entities by ID
 * @param normalizedEntities Record with entity IDs as keys and entities as values
 * @param ids Array of entity IDs to denormalize
 * @returns Array of entities
 */
export function denormalizeByIds<T>(normalizedEntities: Record<string, T>, ids: string[]): T[] {
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
  const updates = normalizeArray(entities);
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