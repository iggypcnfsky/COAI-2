import { StateCreator } from 'zustand';
import { RootState } from '../../types/store';
import { COAIProfile, COAIProfileData } from '../../types';
import { AppSession, AppUser } from '../../types/auth';
import { upsertEntity } from '../../lib/utils/normalization';
import { apiFetch } from '../../lib/api/client';

export interface AuthSlice {
  session: AppSession | null;
  user: AppUser | null;
  profile: COAIProfile | null;
  isAuthenticated: boolean;
  subscriptionStatus: string;
  onboardedAt: string | null;
  hasByok: boolean;
  tempApiKeys: {
    openrouter?: string;
    [key: string]: string | undefined;
  };
  setSession: (session: AppSession | null) => void;
  setUser: (user: AppUser | null) => void;
  setProfile: (profile: COAIProfile | null) => void;
  setSubscription: (status: string, onboardedAt?: string | null, hasByok?: boolean) => void;
  setTempApiKey: (provider: string, key: string) => void;
  removeTempApiKey: (provider: string) => void;
  clearTempApiKeys: () => void;
  saveApiKey: (provider: string, key: string) => Promise<{ error: Error | null }>;
  removeApiKey: (provider: string) => Promise<{ error: Error | null }>;
  getApiKey: (provider: string) => string | undefined;
  signIn: (_email?: string, _password?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (_email?: string, _password?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (profileData: Partial<COAIProfileData>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  refreshProfileFromUser: () => Promise<void>;
  _loadProfile: (userId: string) => Promise<void>;
  _createProfile: (userId: string) => Promise<void>;
}

export const createAuthSlice: StateCreator<
  RootState,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  AuthSlice
> = (set, get) => ({
  session: null,
  user: null,
  profile: null,
  isAuthenticated: false,
  subscriptionStatus: 'none',
  onboardedAt: null,
  hasByok: false,
  tempApiKeys: {},

  setSession: (session) => {
    set(() => ({ session, isAuthenticated: !!session }), false, 'auth/setSession');
  },
  setUser: (user) => {
    set(() => ({ user }), false, 'auth/setUser');
  },
  setProfile: (profile) => {
    set((state) => ({
      profile,
      ...(profile
        ? {
            entities: {
              ...state.entities,
              profiles: upsertEntity(state.entities.profiles, profile),
            },
          }
        : {}),
    }), false, 'auth/setProfile');
  },
  setSubscription: (status, onboardedAt, hasByok) => {
    set(() => ({
      subscriptionStatus: status,
      onboardedAt: onboardedAt ?? get().onboardedAt,
      hasByok: hasByok ?? get().hasByok,
    }), false, 'auth/setSubscription');
  },
  setTempApiKey: (provider, key) => {
    set((state) => ({ tempApiKeys: { ...state.tempApiKeys, [provider]: key } }), false, 'auth/setTempApiKey');
  },
  removeTempApiKey: (provider) => {
    set((state) => {
      const next = { ...state.tempApiKeys };
      delete next[provider];
      return { tempApiKeys: next };
    }, false, 'auth/removeTempApiKey');
  },
  clearTempApiKeys: () => set(() => ({ tempApiKeys: {} }), false, 'auth/clearTempApiKeys'),

  saveApiKey: async (provider, key) => {
    try {
      if (provider === 'openrouter') {
        await apiFetch('/me/openrouter-key', { method: 'PUT', body: JSON.stringify({ key }) });
        get().setSubscription(get().subscriptionStatus, get().onboardedAt, true);
      }
      get().setTempApiKey(provider, key);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
  removeApiKey: async (provider) => {
    try {
      if (provider === 'openrouter') {
        await apiFetch('/me/openrouter-key', { method: 'PUT', body: JSON.stringify({ key: null }) });
        get().setSubscription(get().subscriptionStatus, get().onboardedAt, false);
      }
      get().removeTempApiKey(provider);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
  getApiKey: (provider) => get().tempApiKeys[provider],

  signIn: async () => {
    window.location.assign('/sign-in');
    return { error: null };
  },
  signInWithGoogle: async () => {
    window.location.assign('/sign-in');
    return { error: null };
  },
  signUp: async () => {
    window.location.assign('/sign-up');
    return { error: null };
  },
  signOut: async () => {
    set(() => ({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      subscriptionStatus: 'none',
      onboardedAt: null,
    }), false, 'auth/signOut');
    return { error: null };
  },
  updateProfile: async (profileData) => {
    try {
      const saved = await apiFetch<COAIProfile>('/me/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      get().setProfile(saved);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
  refreshProfile: async () => {
    await get()._loadProfile(get().user?.id || '');
  },
  refreshProfileFromUser: async () => {
    await get().refreshProfile();
  },
  _loadProfile: async () => {
    try {
      const me = await apiFetch<{
        user: { subscriptionStatus: string; onboardedAt: string | null; hasByok: boolean };
        profile: COAIProfile | null;
      }>('/me');
      if (me.profile) get().setProfile(me.profile);
      get().setSubscription(me.user.subscriptionStatus, me.user.onboardedAt, me.user.hasByok);
    } catch (error) {
      console.error('Error loading profile', error);
    }
  },
  _createProfile: async () => {
    await get()._loadProfile('');
  },
});
