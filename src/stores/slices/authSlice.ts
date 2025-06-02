import { AuthError, Session, User } from '@supabase/supabase-js';
import { StateCreator } from 'zustand';
import { RootState } from '../../types/store';
import { supabase } from '../../lib/supabase';
import { COAIProfile, COAIProfileData } from '../../types';
import { upsertEntity } from '../../lib/utils/normalization';
import { LoadingStateKey } from '../../types/store';

// Define the auth slice interface
export interface AuthSlice {
  // State
  session: Session | null;
  user: User | null;
  profile: COAIProfile | null;
  isAuthenticated: boolean;
  tempApiKeys: {
    openai?: string;
    anthropic?: string;
    googleai?: string;
    [key: string]: string | undefined;
  };
  
  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: COAIProfile | null) => void;
  setTempApiKey: (provider: string, key: string) => void;
  removeTempApiKey: (provider: string) => void;
  clearTempApiKeys: () => void;
  
  // Auth operations
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (profileData: Partial<COAIProfileData>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  refreshProfileFromUser: () => Promise<void>;
  
  // Internal methods
  _loadProfile: (userId: string) => Promise<void>;
  _createProfile: (userId: string) => Promise<void>;
}

// Create the auth slice
export const createAuthSlice: StateCreator<
  RootState,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  AuthSlice
> = (set, get) => ({
  // State
  session: null,
  user: null,
  profile: null,
  isAuthenticated: false,
  tempApiKeys: {},
  
  // Actions
  setSession: (session) => {
    set(() => ({
      session,
      isAuthenticated: !!session,
    }), false, 'auth/setSession');
  },
  
  setUser: (user) => {
    set(() => ({
      user,
    }), false, 'auth/setUser');
  },
  
  setProfile: (profile) => {
    set((state) => ({
      profile,
      
      // Also update the profiles entity if we have a profile
      ...(profile ? {
        entities: {
          ...state.entities,
          profiles: upsertEntity(state.entities.profiles, profile),
        },
      } : {}),
    }), false, 'auth/setProfile');
  },
  
  setTempApiKey: (provider, key) => {
    set((state) => ({
      tempApiKeys: {
        ...state.tempApiKeys,
        [provider]: key,
      },
    }), false, 'auth/setTempApiKey');
  },
  
  removeTempApiKey: (provider) => {
    set((state) => {
      const newTempApiKeys = { ...state.tempApiKeys };
      delete newTempApiKeys[provider];
      
      return {
        tempApiKeys: newTempApiKeys,
      };
    }, false, 'auth/removeTempApiKey');
  },
  
  clearTempApiKeys: () => {
    set(() => ({
      tempApiKeys: {},
    }), false, 'auth/clearTempApiKeys');
  },
  
  // Auth operations
  signIn: async (email, password) => {
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.AUTH_SIGNIN]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.AUTH_SIGNIN]: null,
        },
      },
    }), false, 'auth/signIn/start');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        set((state) => ({
          ui: {
            ...state.ui,
            loadingStates: {
              ...state.ui.loadingStates,
              [LoadingStateKey.AUTH_SIGNIN]: false,
            },
            errors: {
              ...state.ui.errors,
              [LoadingStateKey.AUTH_SIGNIN]: error,
            },
          },
        }), false, 'auth/signIn/error');
        
        return { error };
      }
      
      // Session and user will be set by the auth listener in initialization
      
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNIN]: false,
          },
        },
      }), false, 'auth/signIn/success');
      
      return { error: null };
    } catch (error) {
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNIN]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.AUTH_SIGNIN]: error as Error,
          },
        },
      }), false, 'auth/signIn/error');
      
      return { error: error as AuthError };
    }
  },
  
  signInWithGoogle: async () => {
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.AUTH_SIGNIN]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.AUTH_SIGNIN]: null,
        },
      },
    }), false, 'auth/signInWithGoogle/start');
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        set((state) => ({
          ui: {
            ...state.ui,
            loadingStates: {
              ...state.ui.loadingStates,
              [LoadingStateKey.AUTH_SIGNIN]: false,
            },
            errors: {
              ...state.ui.errors,
              [LoadingStateKey.AUTH_SIGNIN]: error,
            },
          },
        }), false, 'auth/signInWithGoogle/error');
        
        return { error };
      }
      
      // Auth state will be handled by the onAuthStateChange listener
      
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNIN]: false,
          },
        },
      }), false, 'auth/signInWithGoogle/success');
      
      return { error: null };
    } catch (error) {
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNIN]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.AUTH_SIGNIN]: error as Error,
          },
        },
      }), false, 'auth/signInWithGoogle/error');
      
      return { error: error as AuthError };
    }
  },
  
  signUp: async (email, password) => {
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.AUTH_SIGNIN]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.AUTH_SIGNIN]: null,
        },
      },
    }), false, 'auth/signUp/start');
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        set((state) => ({
          ui: {
            ...state.ui,
            loadingStates: {
              ...state.ui.loadingStates,
              [LoadingStateKey.AUTH_SIGNIN]: false,
            },
            errors: {
              ...state.ui.errors,
              [LoadingStateKey.AUTH_SIGNIN]: error,
            },
          },
        }), false, 'auth/signUp/error');
        
        return { error };
      }
      
      // Profile will be created automatically when user signs in
      
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNIN]: false,
          },
        },
      }), false, 'auth/signUp/success');
      
      return { error: null };
    } catch (error) {
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNIN]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.AUTH_SIGNIN]: error as Error,
          },
        },
      }), false, 'auth/signUp/error');
      
      return { error: error as AuthError };
    }
  },
  
  signOut: async () => {
    console.log('🔍 AUTH SLICE: Starting signOut process');
    
    set((state) => ({
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.AUTH_SIGNOUT]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.AUTH_SIGNOUT]: null,
        },
      },
      // Immediately reset auth state for a smoother UX
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
    }), false, 'auth/signOut/start');
    
    try {
      console.log('🔍 AUTH SLICE: Making supabase.auth.signOut() call');
      
      // Increase timeout to 10 seconds and log progress
      const signOutPromise = new Promise(async (resolve, reject) => {
        try {
          console.log('🔍 AUTH SLICE: Inside signOut promise wrapper');
          // Try to clear tokens directly first
          try {
            console.log('🔍 AUTH SLICE: Manually clearing tokens from storage');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
            console.log('🔍 AUTH SLICE: Successfully cleared tokens from storage');
          } catch (e) {
            console.warn('🔍 AUTH SLICE: Failed to clear session storage:', e);
          }
          
          console.log('🔍 AUTH SLICE: Calling Supabase signOut API');
          const result = await supabase.auth.signOut();
          console.log('🔍 AUTH SLICE: Supabase signOut API call completed', result);
          resolve(result);
        } catch (e) {
          console.error('🔍 AUTH SLICE: Error in signOut promise:', e);
          reject(e);
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => {
          console.warn('🔍 AUTH SLICE: Sign out operation timed out after 10 seconds');
          reject(new Error('Sign out timeout'));
        }, 10000); // Increased to 10 seconds
        
        // Ensure the timeout is cleared if the promise resolves
        return () => clearTimeout(id);
      });
      
      console.log('🔍 AUTH SLICE: Starting Promise.race');
      // Use Promise.race to handle potential timeouts
      const raceResult = await Promise.race([
        signOutPromise,
        timeoutPromise.then(() => {
          console.warn('⚠️ AUTH SLICE: Sign out operation timed out, but we can still reset the local state');
          return { error: null };
        }).catch(err => {
          console.error('🔍 AUTH SLICE: Timeout promise rejected with:', err);
          return { error: err instanceof Error ? err : new Error(String(err)) };
        })
      ]);
      
      // Explicitly extract error with proper typing
      const { error } = raceResult as { error: AuthError | null };
      
      if (error) {
        console.error('❌ AUTH SLICE: Sign out error:', error);
        set((state) => ({
          ui: {
            ...state.ui,
            loadingStates: {
              ...state.ui.loadingStates,
              [LoadingStateKey.AUTH_SIGNOUT]: false,
            },
            errors: {
              ...state.ui.errors,
              [LoadingStateKey.AUTH_SIGNOUT]: error,
            },
          },
        }), false, 'auth/signOut/error');
        
        return { error };
      }
      
      // Keep temp API keys if any
      const tempApiKeys = get().tempApiKeys;
      
      // Ensure auth state is fully reset
      set((state) => ({
        session: null,
        user: null,
        profile: null,
        isAuthenticated: false,
        // Keep temp API keys
        tempApiKeys,
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNOUT]: false,
          },
        },
      }), false, 'auth/signOut/success');
      
      console.log('✅ AUTH SLICE: Successfully signed out and reset auth state');
      
      // Force clear localStorage session data as a fallback
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Try to clear all supabase-related items
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('supabase')) {
            console.log('🔍 AUTH SLICE: Removing storage item:', key);
            localStorage.removeItem(key);
          }
        }
        
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.includes('supabase')) {
            console.log('🔍 AUTH SLICE: Removing session storage item:', key);
            sessionStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn('Failed to clear session storage:', e);
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ AUTH SLICE: Sign out exception:', error);
      set((state) => ({
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.AUTH_SIGNOUT]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.AUTH_SIGNOUT]: error as Error,
          },
        },
        // Even on error, reset auth state to ensure user is signed out locally
        session: null,
        user: null, 
        profile: null,
        isAuthenticated: false,
      }), false, 'auth/signOut/error');
      
      return { error: error as AuthError };
    }
  },
  
  updateProfile: async (profileData) => {
    try {
      const profile = get().profile;
      
      if (!profile) {
        return { error: new Error('No profile found') };
      }
      
      const updatedProfileData = {
        ...profile.profile_data,
        ...profileData,
      };
      
      const { data, error } = await supabase
        .from('coai-profiles')
        .update({
          profile_data: updatedProfileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();
      
      if (error) {
        return { error };
      }
      
      get().setProfile(data);
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
  
  refreshProfile: async () => {
    const user = get().user;
    
    if (user) {
      await get()._loadProfile(user.id);
    }
  },
  
  refreshProfileFromUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return;
      }
      
      get().setUser(user);
      await get()._loadProfile(user.id);
    } catch (error) {
      console.error('Error refreshing profile from user:', error);
    }
  },
  
  // Internal methods
  _loadProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('coai-profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading profile:', error);
        return;
      }
      
      if (data) {
        get().setProfile(data);
      } else {
        // Create profile if it doesn't exist
        await get()._createProfile(userId);
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
    }
  },
  
  _createProfile: async (userId) => {
    try {
      console.log('🔍 DEBUG: _createProfile called for userId:', userId);
      
      const user = get().user;
      
      if (!user) {
        console.log('🔍 DEBUG: No user found, skipping profile creation');
        return;
      }
      
      const userMetadata = user.user_metadata || {};
      const identities = user.identities || [];
      
      // Google OAuth provides different metadata fields
      const googleIdentity = identities.find(identity => identity.provider === 'google');
      const googleData = googleIdentity?.identity_data || {};
      
      // Try multiple sources for avatar
      let avatar = 
        userMetadata.avatar_url || 
        userMetadata.picture ||
        googleData.avatar_url ||
        googleData.picture;
      
      // Fallback: If no avatar found and we have a Google provider ID, construct Google avatar URL
      if (!avatar && (googleData.provider_id || googleData.sub)) {
        const googleId = googleData.provider_id || googleData.sub;
        avatar = `https://lh3.googleusercontent.com/a/${googleId}`;
      }
      
      const defaultProfileData: COAIProfileData = {
        displayName: 
          userMetadata.full_name || 
          userMetadata.name || 
          googleData.full_name ||
          googleData.name ||
          user.email?.split('@')[0] || 
          'User',
        avatar,
        preferences: {
          theme: 'auto',
          notifications: true,
          defaultModel: 'gpt-4o'
        }
      };
      
      console.log('🔍 DEBUG: Attempting to insert profile for userId:', userId);
      
      const { data, error } = await supabase
        .from('coai-profiles')
        .insert({
          user_id: userId,
          profile_data: defaultProfileData
        })
        .select()
        .single();
      
      if (error) {
        console.error('🔍 DEBUG: Profile creation error:', error);
        
        // If profile already exists (duplicate key), try to update it instead
        if (error.code === '23505') {
          console.log('🔍 DEBUG: Profile already exists, attempting update instead');
          const { data: updateData, error: updateError } = await supabase
            .from('coai-profiles')
            .update({
              profile_data: defaultProfileData,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
          
          if (updateError) {
            console.error('🔍 DEBUG: Error updating existing profile:', updateError);
            return;
          }
          
          console.log('🔍 DEBUG: Profile updated successfully after duplicate key error');
          get().setProfile(updateData);
        }
        
        return;
      }
      
      console.log('🔍 DEBUG: Profile created successfully');
      get().setProfile(data);
    } catch (error) {
      console.error('🔍 DEBUG: Error in createProfile:', error);
    }
  },
}); 