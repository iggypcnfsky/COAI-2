// API utility functions for the application

import { useAppStore } from '../stores/appStore';


export const getOpenAIApiKey = (): string | null => {
  return localStorage.getItem('openai_api_key');
};

export const setOpenAIApiKey = (apiKey: string): void => {
  localStorage.setItem('openai_api_key', apiKey);
};

export const removeOpenAIApiKey = (): void => {
  localStorage.removeItem('openai_api_key');
};

export const hasOpenAIApiKey = (): boolean => {
  const apiKey = getOpenAIApiKey();
  return apiKey !== null && apiKey.trim().length > 0;
};

// Runware API key management
export const getRunwareApiKey = (): string | null => {
  return localStorage.getItem('runware_api_key');
};

export const setRunwareApiKey = (apiKey: string): void => {
  localStorage.setItem('runware_api_key', apiKey);
};

export const removeRunwareApiKey = (): void => {
  localStorage.removeItem('runware_api_key');
};

export const hasRunwareApiKey = (): boolean => {
  const apiKey = getRunwareApiKey();
  return apiKey !== null && apiKey.trim().length > 0;
};

// Edge function base URL - using the actual Supabase project URL
const getEdgeFunctionUrl = (functionName: string): string => {
  // Use the actual Supabase project URL
  const baseUrl = 'https://hiuinnexazfqhodamhgk.supabase.co';
  return `${baseUrl}/functions/v1/${functionName}`;
};

// Get Supabase headers for edge function calls
const getSupabaseHeaders = () => {
  // Try to get the key from environment variables
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔑 Supabase Key Check:', { 
    hasEnvKey: !!SUPABASE_ANON_KEY,
    envVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
  });
  
  if (!SUPABASE_ANON_KEY) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY not found in environment variables');
    
    // Fallback to the hardcoded key (only for development to prevent blocking)
    const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWlubmV4YXpmcWhvZGFtaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxMjU1OTEsImV4cCI6MjAyMjcwMTU5MX0.EhjlgV84WnuBMivKyNE7jTRZDdxn30YZXlsaTYl9m2o';
    console.log('⚠️ Using fallback anon key for development');
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${fallbackKey}`,
    };
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
};

export interface SynthGenerationRequest {
  keywords: string;
  baseModel?: string;
  averageAge?: number;
  gender?: string;
}

export interface TeamGenerationRequest {
  keywords: string;
  teamSize?: number;
  useExistingSynths?: boolean;
  existingSynths?: Array<{
    id: string;
    name: string;
    role: string;
    bio?: string;
    experience?: string[];
  }>;
  baseModel?: string;
  teamType?: 'team' | 'group';
  averageAge?: number;
  genderDistribution?: { male: number; female: number; nonBinary: number; };
}

export interface GeneratedSynth {
  name: string;
  age: number;
  gender?: string;
  role: string;
  systemPrompt: string;
  baseModel: string;
  profileImage: string;
  bio?: string;
  experience?: string[];
  mentalModels?: string[];
  coreParadigm?: string;
  systemsPerspective?: string;
  isLoadingImage?: boolean;
}

export const generateAISynth = async (request: SynthGenerationRequest): Promise<GeneratedSynth> => {
  // Get API key from Zustand store instead of localStorage
  const apiKey = useAppStore.getState().tempApiKeys.openai;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set your API key in settings.');
  }

  const response = await fetch(getEdgeFunctionUrl('create-synth-ai'), {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({
      ...request,
      openaiApiKey: apiKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Edge function error:', errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate synth');
  }

  return result.synth;
};

export const generateSynthImage = async (synthData: GeneratedSynth & { keywords?: string }): Promise<string> => {
  // Get Runware API key from Zustand store instead of localStorage
  const store = useAppStore.getState();
  console.log('🔑 API Key State:', { 
    hasStoreKeys: !!store.tempApiKeys, 
    keys: Object.keys(store.tempApiKeys || {})
  });
  
  // First try to get the key from Zustand store
  let runwareApiKey = store.tempApiKeys?.runware;
  
  // If not in store, fall back to localStorage for backwards compatibility
  if (!runwareApiKey) {
    console.log('⚠️ Runware API key not found in Zustand store, checking localStorage...');
    const localStorageKey = localStorage.getItem('runware_api_key');
    if (localStorageKey) {
      runwareApiKey = localStorageKey;
    }
  }
  
  console.log('🔑 Runware API Key Status:', { 
    hasKey: !!runwareApiKey, 
    keyLength: runwareApiKey ? runwareApiKey.length : 0,
    source: store.tempApiKeys?.runware ? 'zustand' : (runwareApiKey ? 'localStorage' : 'none')
  });
  
  if (!runwareApiKey) {
    console.error('❌ Runware API key is missing from both store and localStorage!');
    throw new Error('Runware API key not found. Please set your Runware API key in settings.');
  }

  console.log(`🎨 Starting background image generation for: ${synthData.name}`);
  
  // Log endpoint URL
  const endpointUrl = getEdgeFunctionUrl('generate-synth-image');
  console.log('🔗 Edge Function URL:', endpointUrl);
  
  // Log request headers
  const headers = getSupabaseHeaders();
  console.log('📋 Request Headers:', headers);
  
  // Clean up the synth data to ensure it has the required properties
  const cleanedSynthData = {
    // Add an ID for tracking in Storage, but it's not part of GeneratedSynth type
    id: `temp-synth-${Date.now()}`,
    name: synthData.name,
    age: synthData.age,
    role: synthData.role,
    bio: synthData.bio || '',
    systemPrompt: synthData.systemPrompt,
    baseModel: synthData.baseModel,
    keywords: synthData.keywords || synthData.role, // Use passed keywords or fallback to role
  };
  
  console.log('📋 Request Payload:', {
    synthData: cleanedSynthData,
    imageType: 'synth',
    hasRunwareKey: !!runwareApiKey
  });

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        synthData: cleanedSynthData,
        runwareApiKey: runwareApiKey,
        imageType: 'synth'
      }),
    });

    console.log('🔄 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Image generation error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Image generation response:', { 
      success: result.success, 
      hasProfileImage: !!result.profileImage,
      hasDataUrl: !!result.dataUrl,
      resultKeys: Object.keys(result)
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to generate image');
    }

    console.log(`✅ Background image generated for: ${synthData.name}`);
    // Return the public URL from Supabase Storage, falling back to dataUrl if needed
    return result.profileImage || result.dataUrl;
  } catch (error) {
    console.error('❌ Exception during image generation:', error);
    throw error;
  }
};

export const generateTeamImage = async (teamData: any): Promise<string> => {
  // Get Runware API key from Zustand store instead of localStorage
  const store = useAppStore.getState();
  console.log('🔑 Team Image - API Key State:', { 
    hasStoreKeys: !!store.tempApiKeys, 
    keys: Object.keys(store.tempApiKeys || {})
  });
  
  // First try to get the key from Zustand store
  let runwareApiKey = store.tempApiKeys?.runware;
  
  // If not in store, fall back to localStorage for backwards compatibility
  if (!runwareApiKey) {
    console.log('⚠️ Team Image - Runware API key not found in Zustand store, checking localStorage...');
    const localStorageKey = localStorage.getItem('runware_api_key');
    if (localStorageKey) {
      runwareApiKey = localStorageKey;
    }
  }
  
  console.log('🔑 Team Image - Runware API Key Status:', { 
    hasKey: !!runwareApiKey, 
    keyLength: runwareApiKey ? runwareApiKey.length : 0,
    source: store.tempApiKeys?.runware ? 'zustand' : (runwareApiKey ? 'localStorage' : 'none')
  });
  
  if (!runwareApiKey) {
    console.error('❌ Team Image - Runware API key is missing from both store and localStorage!');
    throw new Error('Runware API key not found. Please set your Runware API key in settings.');
  }

  console.log(`🎨 Starting background team image generation for: ${teamData.name}`);

  const response = await fetch(getEdgeFunctionUrl('generate-synth-image'), {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({
      teamData: teamData,
      runwareApiKey: runwareApiKey,
      imageType: 'team'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Team image generation error:', errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate team image');
  }

  console.log(`✅ Background team image generated for: ${teamData.name}`);
  // Return the public URL from Supabase Storage, falling back to dataUrl if needed
  return result.teamImage || result.dataUrl;
};

export const generateAITeam = async (request: TeamGenerationRequest) => {
  // Get API key from Zustand store instead of localStorage
  const apiKey = useAppStore.getState().tempApiKeys.openai;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set your API key in settings.');
  }

  console.log(`🔑 Team generation (images will be generated separately)`);

  const response = await fetch(getEdgeFunctionUrl('create-team-ai'), {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({
      ...request,
      openaiApiKey: apiKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Edge function error:', errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate team');
  }

  return result.team;
}; 