/**
 * This file is maintained for backward compatibility only.
 * New code should import directly from src/hooks/store/useApiKey
 * 
 * @deprecated Use useApiKey from src/hooks/store/useApiKey directly
 */

import { useApiKey as useZustandApiKey, ApiKeyHookResult } from '../hooks/store/useApiKey';

// Re-export for compatibility
export const useApiKey = useZustandApiKey;

// Re-export the type
export type { ApiKeyHookResult };

// Maintain Provider for compatibility (but it doesn't do anything now)
export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
}; 