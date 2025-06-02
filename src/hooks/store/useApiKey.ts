import { useMemo } from 'react';
import { useAppStore } from '../../stores';

// Interface to match the existing apiKeyContext for compatibility
export interface ApiKeyHookResult {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  isApiKeyValid: boolean;
}

/**
 * Hook to access API key state and actions
 * This provides a drop-in replacement for the existing apiKeyContext
 */
export function useApiKey(): ApiKeyHookResult {
  // Get API key from store
  const tempApiKeys = useAppStore((state) => state.tempApiKeys);
  const setTempApiKey = useAppStore((state) => state.setTempApiKey);
  
  // Get OpenAI API key
  const openaiApiKey = tempApiKeys.openai || '';
  
  // Set OpenAI API key
  const setOpenaiApiKey = (key: string) => {
    if (key) {
      setTempApiKey('openai', key);
    } else {
      // Remove key
      useAppStore.getState().removeTempApiKey('openai');
    }
  };
  
  // Check if API key is valid
  const isApiKeyValid = useMemo(() => {
    return openaiApiKey.trim().length > 0;
  }, [openaiApiKey]);
  
  return {
    openaiApiKey,
    setOpenaiApiKey,
    isApiKeyValid,
  };
} 