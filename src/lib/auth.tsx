import { createContext, useContext, ReactNode } from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { COAIProfile, COAIProfileData } from '../types'
import { useAuth as useZustandAuth } from '../hooks/store/useAuth'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: COAIProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (profileData: Partial<COAIProfileData>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
  refreshProfileFromUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider now uses Zustand store for state management
 * This maintains the same interface as before but delegates to Zustand
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Use the Zustand auth hook
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
    refreshProfile
  } = useZustandAuth();
  
  // Create refreshProfileFromUser function for backward compatibility
  const refreshProfileFromUser = async () => {
    if (user) {
      await refreshProfile();
    }
  };
  
  // Provide the same context interface as before
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
        refreshProfileFromUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 