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
  return { ...result.synth, isLoadingImage: result.synth.isLoadingImage ?? true };
};

export function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  return url.startsWith('data:image/svg') || url.includes('placeholder') || url.includes('default-avatar');
}

export const generateSynthImage = async (synthData: GeneratedSynth & { keywords?: string }): Promise<string> => {
  if (synthData.profileImage && !isPlaceholderImage(synthData.profileImage)) {
    return synthData.profileImage;
  }

  const result = await apiFetch<{ success: boolean; url?: string; error?: string }>('/generate/image', {
    method: 'POST',
    body: JSON.stringify({
      kind: 'synth',
      name: synthData.name,
      role: synthData.role,
      age: synthData.age,
      gender: synthData.gender,
      bio: synthData.bio?.slice(0, 500),
      keywords: synthData.keywords?.slice(0, 300),
    }),
  });
  if (!result.success || !result.url) {
    throw new Error(result.error || 'Failed to generate synth image');
  }
  return result.url;
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
  description?: string;
  keywords?: string;
}): Promise<string> => {
  const existing = teamData.teamImage || teamData.profileImage || '';
  if (existing && !isPlaceholderImage(existing)) {
    return existing;
  }

  const result = await apiFetch<{ success: boolean; url?: string; error?: string }>('/generate/image', {
    method: 'POST',
    body: JSON.stringify({
      kind: 'team',
      name: teamData.name || 'Team',
      description: teamData.description?.slice(0, 500),
      keywords: teamData.keywords?.slice(0, 300),
    }),
  });
  if (!result.success || !result.url) {
    throw new Error(result.error || 'Failed to generate team image');
  }
  return result.url;
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
