import { apiFetch } from '@/lib/api/client';

export const getOpenAIApiKey = (): string | null => null;
export const setOpenAIApiKey = (_apiKey: string): void => {};
export const removeOpenAIApiKey = (): void => {};
export const hasOpenAIApiKey = (): boolean => true;
export const getRunwareApiKey = (): string | null => null;
export const setRunwareApiKey = (_apiKey: string): void => {};
export const removeRunwareApiKey = (): void => {};
export const hasRunwareApiKey = (): boolean => false;

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
  genderDistribution?: { male: number; female: number; nonBinary: number };
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
  const result = await apiFetch<{ success: boolean; error?: string; synth: GeneratedSynth }>('/generate/synth', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate synth');
  }
  return { ...result.synth, isLoadingImage: false };
};

export const generateSynthImage = async (synthData: GeneratedSynth & { keywords?: string }): Promise<string> => {
  return synthData.profileImage;
};

export interface GeneratedTeamResult {
  name: string;
  description: string;
  members: Array<{
    name: string;
    age: number;
    gender?: string;
    role: string;
    systemPrompt: string;
    baseModel: string;
    profileImage: string;
    bio?: string;
    isExisting?: boolean;
    existingId?: string;
    isLoadingImage?: boolean;
  }>;
  teamImage?: string;
  collaborationStyle?: string;
  isLoadingTeamImage?: boolean;
}

export const generateTeamImage = async (teamData: {
  teamImage?: string;
  profileImage?: string;
  name?: string;
}): Promise<string> => {
  return teamData.teamImage || teamData.profileImage || '';
};

export const generateAITeam = async (request: TeamGenerationRequest): Promise<GeneratedTeamResult> => {
  const result = await apiFetch<{ success: boolean; error?: string; team: GeneratedTeamResult }>('/generate/team', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to generate team');
  }
  return result.team;
};
