// API utility functions for the application

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
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key is not configured');
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
}

export interface GeneratedSynth {
  name: string;
  age: number;
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
  const apiKey = getOpenAIApiKey();
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

export const generateSynthImage = async (synthData: GeneratedSynth): Promise<string> => {
  const runwareApiKey = getRunwareApiKey();
  if (!runwareApiKey) {
    throw new Error('Runware API key not found. Please set your Runware API key in settings.');
  }

  console.log(`🎨 Starting background image generation for: ${synthData.name}`);

  const response = await fetch(getEdgeFunctionUrl('generate-synth-image'), {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({
      synthData: synthData,
      runwareApiKey: runwareApiKey,
      imageType: 'synth'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Image generation error:', errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate image');
  }

  console.log(`✅ Background image generated for: ${synthData.name}`);
  return result.profileImage;
};

export const generateTeamImage = async (teamData: any): Promise<string> => {
  const runwareApiKey = getRunwareApiKey();
  if (!runwareApiKey) {
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
  return result.teamImage;
};

export const generateAITeam = async (request: TeamGenerationRequest) => {
  const apiKey = getOpenAIApiKey();
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