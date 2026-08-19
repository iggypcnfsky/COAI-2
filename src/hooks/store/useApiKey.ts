import { useAppStore } from '../../stores';

export interface ApiKeyHookResult {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  isApiKeyValid: boolean;
}

export function useApiKey(): ApiKeyHookResult {
  const hasByok = useAppStore((state) => state.hasByok);
  const tempApiKeys = useAppStore((state) => state.tempApiKeys);
  const saveApiKey = useAppStore((state) => state.saveApiKey);
  const removeApiKey = useAppStore((state) => state.removeApiKey);

  const openaiApiKey = tempApiKeys.openrouter || '';

  const setOpenaiApiKey = (key: string) => {
    if (key) {
      void saveApiKey('openrouter', key);
    } else {
      void removeApiKey('openrouter');
    }
  };

  return {
    openaiApiKey,
    setOpenaiApiKey,
    isApiKeyValid: true,
    hasByok,
  } as ApiKeyHookResult;
}
