import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { COAIProfile, COAIProfileData } from '../types'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<COAIProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth session
  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...')
        
        // Get initial session with timeout
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: Session | null }, error: AuthError | null }>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 10000)
          )
        ])

        if (!mounted) return

        if (error) {
          console.error('Session error:', error)
          setLoading(false)
          return
        }

        console.log('🔐 Session loaded:', session?.user?.email || 'No session')
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('🔐 Auth state change:', event, session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await loadProfile(session.user.id)
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load user profile from database
  const loadProfile = async (userId: string) => {
    try {
      console.log('👤 Loading profile for user:', userId)
      
      const { data, error } = await Promise.race([
        supabase
          .from('coai-profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        new Promise<{ data: null, error: Error }>((_, reject) => 
          setTimeout(() => reject(new Error('Profile load timeout')), 8000)
        )
      ])

      if (error && 'code' in error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading profile:', error)
        setLoading(false)
        return
      }

      if (data) {
        console.log('👤 Profile loaded:', data.profile_data.displayName)
        setProfile(data)
      } else {
        console.log('👤 No profile found, creating one...')
        // Create profile if it doesn't exist
        await createProfile(userId)
      }
    } catch (error) {
      console.error('Error in loadProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new profile for the user
  const createProfile = async (userId: string) => {
    try {
      const userMetadata = user?.user_metadata || {}
      const identities = user?.identities || []
      
      // Google OAuth provides different metadata fields
      console.log('👤 User metadata:', userMetadata)
      console.log('👤 User identities:', identities)
      
      // Try to get Google profile data from identity_data if available
      const googleIdentity = identities.find(identity => identity.provider === 'google')
      const googleData = googleIdentity?.identity_data || {}
      
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
        console.log('👤 Fallback: Constructed Google avatar URL for profile creation:', avatar);
      }

      const defaultProfileData: COAIProfileData = {
        displayName: 
          userMetadata.full_name || 
          userMetadata.name || 
          googleData.full_name ||
          googleData.name ||
          user?.email?.split('@')[0] || 
          'User',
        avatar,
        preferences: {
          theme: 'auto',
          notifications: true,
          defaultModel: 'gpt-4o'
        }
      }

      console.log('👤 Creating profile with data:', defaultProfileData)

      const { data, error } = await supabase
        .from('coai-profiles')
        .insert({
          user_id: userId,
          profile_data: defaultProfileData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        
        // If profile already exists (duplicate key), try to update it instead
        if (error.code === '23505') {
          console.log('👤 Profile already exists, updating instead...')
          
          const { data: updateData, error: updateError } = await supabase
            .from('coai-profiles')
            .update({
              profile_data: defaultProfileData,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single()

          if (updateError) {
            console.error('Error updating existing profile:', updateError)
            return
          }

          console.log('👤 Profile updated successfully')
          setProfile(updateData)
        }
        return
      }

      console.log('👤 Profile created successfully')
      setProfile(data)
    } catch (error) {
      console.error('Error in createProfile:', error)
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setLoading(false)
      }
      
      return { error }
    } catch (error) {
      setLoading(false)
      return { error: error as AuthError }
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      console.log('🔐 Starting Google sign-in...')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) {
        console.error('Google sign-in error:', error)
      } else {
        console.log('🔐 Google sign-in initiated successfully')
      }
      
      return { error }
    } catch (error) {
      console.error('Google sign-in exception:', error)
      return { error: error as AuthError }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      // Note: Profile will be created automatically when the user signs in
      // after email confirmation (handled by onAuthStateChange)
      
      if (error) {
        setLoading(false)
      }
      
      return { error }
    } catch (error) {
      setLoading(false)
      return { error: error as AuthError }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      console.log('🔐 Attempting to sign out...')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        setLoading(false)
        return { error }
      }
      
      console.log('🔐 Sign out successful')
      
      // Clear state immediately
      setSession(null)
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      return { error: null }
    } catch (error) {
      console.error('Sign out exception:', error)
      setLoading(false)
      return { error: error as AuthError }
    }
  }

  // Update user profile
  const updateProfile = async (profileData: Partial<COAIProfileData>) => {
    if (!user || !profile) {
      return { error: new Error('User not authenticated') }
    }

    try {
      const updatedProfileData = {
        ...profile.profile_data,
        ...profileData
      }

      const { data, error } = await supabase
        .from('coai-profiles')
        .update({
          profile_data: updatedProfileData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return { error }
      }

      setProfile(data)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Refresh profile from database
  const refreshProfile = async () => {
    if (!user) return
    await loadProfile(user.id)
  }

  // Force refresh profile data from current user (useful after OAuth)
  const refreshProfileFromUser = async () => {
    if (!user) return
    
    try {
      // Delete and recreate profile to get fresh Google data
      if (profile) {
        await supabase
          .from('coai-profiles')
          .delete()
          .eq('user_id', user.id)
      }
      
      await createProfile(user.id)
    } catch (error) {
      console.error('Error refreshing profile from user:', error)
    }
  }

  const value: AuthContextType = {
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
  }

  return (
    <AuthContext.Provider value={value}>
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