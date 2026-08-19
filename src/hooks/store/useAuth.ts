import { useAppStore } from '../../stores/appStore';
import { AppSession, AppUser } from '../../types/auth';
import { COAIProfile, COAIProfileData } from '../../types';

export interface AuthHookResult {
  session: AppSession | null;
  user: AppUser | null;
  profile: COAIProfile | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email?: string, password?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (profileData: Partial<COAIProfileData>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthHookResult {
  const session = useAppStore((state) => state.session);
  const user = useAppStore((state) => state.user);
  const profile = useAppStore((state) => state.profile);
  const signIn = useAppStore((state) => state.signIn);
  const signInWithGoogle = useAppStore((state) => state.signInWithGoogle);
  const signUp = useAppStore((state) => state.signUp);
  const signOut = useAppStore((state) => state.signOut);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const refreshProfile = useAppStore((state) => state.refreshProfile);

  return {
    session,
    user,
    profile,
    loading: false,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
