import { createContext, useContext, ReactNode } from 'react';
import { COAIProfile, COAIProfileData } from '../types';
import { AppSession, AppUser } from '../types/auth';
import { useAuth as useZustandAuth } from '../hooks/store/useAuth';

interface AuthContextType {
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
  refreshProfileFromUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    session,
    user,
    profile,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  } = useZustandAuth();

  const refreshProfileFromUser = async () => {
    if (user) {
      await refreshProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        refreshProfileFromUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
