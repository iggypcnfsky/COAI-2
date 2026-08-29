import { DEFAULT_MODEL_ID } from '@shared/models';
import type { CustomTeam } from '@/components/browser/CreateTeamModal';
import type { AIEmployee, ChatMessage, TeamMember } from '@/types';

function avatarUrl(slug: string) {
  return `/design/avatars/${slug}.webp`;
}

export const PREVIEW_SYNTHS: AIEmployee[] = [
  {
    id: 'preview-anya',
    name: 'Anya Voss',
    role: 'Chair',
    age: 44,
    gender: 'female',
    profileImage: avatarUrl('anya-voss'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#8b5cf6',
  },
  {
    id: 'preview-lev',
    name: 'Lev Hart',
    role: 'Skeptic',
    age: 37,
    gender: 'male',
    profileImage: avatarUrl('lev-hart'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#f97316',
  },
  {
    id: 'preview-noor',
    name: 'Noor Ellison',
    role: 'Builder',
    age: 31,
    gender: 'female',
    profileImage: avatarUrl('noor-ellison'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#06b6d4',
  },
  {
    id: 'preview-mateo',
    name: 'Mateo Ruiz',
    role: 'Numbers',
    age: 52,
    gender: 'male',
    profileImage: avatarUrl('mateo-ruiz'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#22c55e',
  },
  {
    id: 'preview-priya',
    name: 'Priya Kaur',
    role: 'Counsel',
    age: 29,
    gender: 'female',
    profileImage: avatarUrl('priya-kaur'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#ef4444',
  },
  {
    id: 'preview-jonah',
    name: 'Jonah Okada',
    role: 'Designer',
    age: 34,
    gender: 'male',
    profileImage: avatarUrl('jonah-okada'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#eab308',
  },
  {
    id: 'preview-amara',
    name: 'Amara Mwangi',
    role: 'Operator',
    age: 41,
    gender: 'female',
    profileImage: avatarUrl('amara-mwangi'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#6366f1',
  },
  {
    id: 'preview-elise',
    name: 'Elise Chen',
    role: 'Researcher',
    age: 26,
    gender: 'female',
    profileImage: avatarUrl('elise-chen'),
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#ec4899',
  },
];

export const PREVIEW_MEMBERS: TeamMember[] = PREVIEW_SYNTHS.map((synth) => ({
  id: synth.id,
  name: synth.name,
  role: synth.role,
  profileImage: synth.profileImage,
  model: synth.baseModel,
  systemPrompt: synth.systemPrompt,
  chatColor: synth.chatColor,
}));

export const PREVIEW_GROUP: CustomTeam = {
  id: 'preview-board',
  name: 'Launch review',
  description: 'Chair, skeptic, builder, and the rest of the room',
  selectedSynths: PREVIEW_SYNTHS,
  isPublic: true,
};

function synthSpeaker(synth: AIEmployee) {
  return {
    id: synth.id,
    name: synth.name,
    role: synth.role,
    profileImage: synth.profileImage,
    model: synth.baseModel,
  };
}

export const PREVIEW_MESSAGES: ChatMessage[] = [
  {
    id: 'preview-user',
    content: 'What’s the fastest path to a believable board meeting?',
    sender: 'user',
    timestamp: new Date('2026-01-15T16:12:00'),
  },
  {
    id: 'preview-anya',
    content:
      'Give me a skeptic, a builder, and a numbers person. Then stay out of the way for ten minutes.',
    sender: 'ai',
    timestamp: new Date('2026-01-15T16:12:18'),
    aiEmployee: synthSpeaker(PREVIEW_SYNTHS[0]),
  },
  {
    id: 'preview-lev',
    content: 'If they agree too quickly, the room is fake. Seat someone whose job is to stall.',
    sender: 'ai',
    timestamp: new Date('2026-01-15T16:12:32'),
    aiEmployee: synthSpeaker(PREVIEW_SYNTHS[1]),
  },
];

export const PREVIEW_CONTINUATION: ChatMessage[] = [
  {
    id: 'preview-anya-lead',
    content: 'I’ll chair. Lev stalls. Noor ships.',
    sender: 'ai',
    timestamp: new Date('2026-01-15T16:12:40'),
    aiEmployee: synthSpeaker(PREVIEW_SYNTHS[0]),
  },
  {
    id: 'preview-anya-follow',
    content: 'Ten minutes, then we vote. If the room is quiet, the room is fake.',
    sender: 'ai',
    timestamp: new Date('2026-01-15T16:12:44'),
    aiEmployee: synthSpeaker(PREVIEW_SYNTHS[0]),
  },
];

export const PREVIEW_LOADING_MESSAGE: ChatMessage = {
  id: 'preview-noor-loading',
  content: '',
  sender: 'ai',
  timestamp: new Date('2026-01-15T16:12:50'),
  isLoading: true,
  aiEmployee: synthSpeaker(PREVIEW_SYNTHS[2]),
};

export const ROLE_SWATCHES = [
  'Chief Product Officer',
  'Chief Technology Officer',
  'Chief Design Officer',
  'Chair',
  'Skeptic',
  'Builder',
];
