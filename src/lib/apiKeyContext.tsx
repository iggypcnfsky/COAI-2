import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  isApiKeyValid: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openaiApiKey, setOpenaiApiKeyState] = useState<string>('');

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setOpenaiApiKeyState(savedKey);
    }
  }, []);

  const setOpenaiApiKey = (key: string) => {
    setOpenaiApiKeyState(key);
    if (key) {
      localStorage.setItem('openai_api_key', key);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  };

  const isApiKeyValid = openaiApiKey.trim().length > 0;

  return (
    <ApiKeyContext.Provider value={{ openaiApiKey, setOpenaiApiKey, isApiKeyValid }}>
      {children}
    </ApiKeyContext.Provider>
  );
}; 