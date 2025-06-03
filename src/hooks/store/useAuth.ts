import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useAppStore } from '../../stores';
import { supabase } from '../../lib/supabase';
import { COAIProfile, COAIProfileData } from '../../types';

// Interface to match the existing auth context for compatibility
export interface AuthHookResult {
  session: Session | null;
  user: any | null; // Use any to match the existing User type for compatibility
  profile: COAIProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signInWithGoogle: () => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<{ error: any | null }>;
  updateProfile: (profileData: Partial<COAIProfileData>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

/**
 * Hook to access auth state and actions
 * This provides a drop-in replacement for the existing auth context
 */
export function useAuth(): AuthHookResult {
  const [loading, setLoading] = useState(true);
  
  // Select state from store
  const session = useAppStore((state) => state.session);
  const user = useAppStore((state) => state.user);
  const profile = useAppStore((state) => state.profile);
  
  // Select actions from store
  const setSession = useAppStore((state) => state.setSession);
  const setUser = useAppStore((state) => state.setUser);
  const setProfile = useAppStore((state) => state.setProfile);
  const _loadProfile = useAppStore((state) => state._loadProfile);
  const signIn = useAppStore((state) => state.signIn);
  const signInWithGoogle = useAppStore((state) => state.signInWithGoogle);
  const signUp = useAppStore((state) => state.signUp);
  const signOut = useAppStore((state) => state.signOut);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const refreshProfile = useAppStore((state) => state.refreshProfile);
  
  // Initialize auth session
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let authSessionInitialized = false;
    
    // Helper function to load profile if we have a user
    const loadProfileIfNeeded = async (userId: string) => {
      if (!userId) return;
      
      try {
        await _loadProfile(userId);
      } catch (profileError) {
        console.error('Error loading profile:', profileError);
      }
    };
    
    // Helper function to restore session from localStorage
    const restoreSessionFromStorage = () => {
      try {
        const storedSession = localStorage.getItem('supabase.auth.token');
        if (!storedSession) return null;
        
        try {
          const parsedSession = JSON.parse(storedSession);
          const currentSession = parsedSession?.currentSession;
          
          if (currentSession?.access_token && currentSession?.user) {
            console.log('🔐 Successfully restored session from localStorage');
            
            // Verify token expiration if possible
            if (currentSession.expires_at) {
              const expiresAt = currentSession.expires_at * 1000; // convert to ms
              const now = Date.now();
              
              if (expiresAt < now) {
                console.warn('⚠️ Restored token is expired, but proceeding to allow refresh attempt');
              } else {
                console.log(`🔐 Token valid for ${Math.floor((expiresAt - now) / 60000)} more minutes`);
              }
            }
            
            return currentSession;
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse stored session:', e);
        }
      } catch (e) {
        console.warn('⚠️ Error accessing localStorage:', e);
      }
      return null;
    };
    
    const initializeAuth = async () => {
      if (authSessionInitialized) return;
      
      try {
        // First try to load and pre-set session from localStorage
        const storedSession = restoreSessionFromStorage();
        if (storedSession) {
          if (mounted) {
            setSession(storedSession);
            setUser(storedSession.user);
            
            // Immediately load profile based on the stored session to improve UX
            if (storedSession.user?.id) {
              loadProfileIfNeeded(storedSession.user.id);
            }
          }
        }
        
        // Now try to get the official session from Supabase with timeout
        let sessionResult;
        try {
          sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: { session: Session | null }, error: any | null }>((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), 30000) // 30 seconds timeout
            )
          ]);
        } catch (timeoutError) {
          console.warn(`⚠️ Auth session request timed out (attempt ${retryCount + 1}/${maxRetries + 1}):`, timeoutError);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Retrying session load (${retryCount}/${maxRetries})...`);
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            initializeAuth();
            return;
          }
          
          // On final timeout, use the session from localStorage if available
          const existingSession = useAppStore.getState().session || storedSession;
          
          if (existingSession) {
            console.log('🔐 Using existing session after Supabase timeout');
            authSessionInitialized = true;
            
            // Force a token refresh if we have a session but Supabase API is timing out
            try {
              console.log('🔄 Attempting to refresh token after timeout...');
              supabase.auth.refreshSession().catch(e => {
                console.warn('⚠️ Token refresh after timeout failed:', e);
              });
            } catch (e) {
              console.warn('⚠️ Error initiating token refresh:', e);
            }
            
            setLoading(false);
            return;
          }
          
          // No session available, proceed with null session
          console.log('⚠️ No session available after timeout, proceeding with logged-out state');
          authSessionInitialized = true;
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (!mounted) return;
        authSessionInitialized = true;

        const { data: { session }, error } = sessionResult;

        if (error) {
          console.error('Session error:', error);
          // Keep existing session if there's an error
          if (storedSession) {
            console.log('🔐 Keeping existing session after Supabase error');
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
          return;
        }

        // Debug logging removed to reduce console noise
        
        if (session) {
          setSession(session);
          setUser(session.user);
          
          if (session.user) {
            loadProfileIfNeeded(session.user.id);
          }
        } else if (storedSession) {
          // If Supabase returns no session but we have a stored one,
          // try to keep using it (it might refresh)
          console.log('⚠️ Supabase returned no session but we have a stored one - attempting recovery');
          setSession(storedSession);
          setUser(storedSession.user);
          
          // Try to refresh the token
          try {
            supabase.auth.refreshSession().catch(e => {
              console.warn('⚠️ Token refresh after null session failed:', e);
            });
          } catch (e) {
            console.warn('⚠️ Error initiating token refresh after null session:', e);
          }
        } else {
          // No session from Supabase or localStorage
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        authSessionInitialized = true;
        
        // Use the stored session as fallback if there's an error
        const storedSession = restoreSessionFromStorage();
        if (storedSession && mounted) {
          console.log('🔐 Using stored session after initialization error');
          setSession(storedSession);
          setUser(storedSession.user);
          if (storedSession.user?.id) {
            loadProfileIfNeeded(storedSession.user.id);
          }
        } else if (mounted) {
          // Set auth state to safe defaults on error with no fallback
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Debug logging removed to reduce console noise
      
      // Handle important auth events
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        
        if (session.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          loadProfileIfNeeded(session.user.id);
          
          // Clean up URL hash after successful OAuth sign-in
          if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
            // Remove auth tokens from URL for better UX
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
      
      setLoading(false);
    });

    // Set up a periodic session verification
    const sessionCheckInterval = setInterval(() => {
      if (!mounted) return;
      
      const currentSession = useAppStore.getState().session;
      if (currentSession?.expires_at) {
        const expiresAt = currentSession.expires_at * 1000; // convert to ms
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // If token expires in less than 10 minutes, try to refresh it
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log(`🔄 Token expires in ${Math.floor(timeUntilExpiry / 60000)} minutes, refreshing...`);
          supabase.auth.refreshSession().catch(e => {
            console.warn('⚠️ Auto token refresh failed:', e);
          });
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, [setSession, setUser, setProfile, _loadProfile]);
  
  // Return the auth state and methods
  return {
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
  };
} 