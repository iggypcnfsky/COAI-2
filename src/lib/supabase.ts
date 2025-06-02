import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://hiuinnexazfqhodamhgk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWlubmV4YXpmcWhvZGFtaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzU3MDIsImV4cCI6MjA0NTExMTcwMn0.iLC9JDOaaGZbsMMwTOZOCfFDdvkVZIvKU41CFoaicx0';

// Configurable timeout for Supabase operations
const SUPABASE_TIMEOUT = 30000; // 30 seconds

// Utility function to create a fetch with timeout and retries
const createFetchWithRetries = (
  maxRetries = 2, 
  timeout = SUPABASE_TIMEOUT,
  retryDelay = 1000
) => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let retryCount = 0;
    
    // Extract URL for logging purposes
    let urlString = '';
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input instanceof Request) {
      urlString = input.url;
    }
    
    // Create a function that will be called recursively for retries
    const fetchWithRetry = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`⚠️ Fetch timeout after ${timeout}ms`);
      }, timeout);
      
      try {
        const fetchOptions = {
          ...init,
          signal: controller.signal,
        };
        
        // Auth operations should have higher priority and longer timeouts
        if (urlString.includes('/auth/') || urlString.includes('auth?')) {
          // Extend timeout for auth operations
          clearTimeout(timeoutId);
          setTimeout(() => controller.abort(), timeout * 1.5);
        }
        
        const response = await fetch(input, fetchOptions);
        clearTimeout(timeoutId);
        
        // Only retry on server errors (5xx) or network issues
        if (!response.ok && response.status >= 500 && retryCount < maxRetries) {
          retryCount++;
          console.warn(`⚠️ Retrying fetch (${retryCount}/${maxRetries}) after server error: ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchWithRetry();
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Only retry on network errors, not on aborts
        if (error instanceof Error && error.name !== 'AbortError' && retryCount < maxRetries) {
          retryCount++;
          console.warn(`⚠️ Retrying fetch (${retryCount}/${maxRetries}) after error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchWithRetry();
        }
        
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`❌ Fetch error:`, error);
        }
        throw error;
      }
    };
    
    return fetchWithRetry();
  };
};

// Create Supabase client with enhanced options
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    debug: false, // Disable auth debugging
    flowType: 'implicit', // Force implicit flow for more reliable auth
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error(`🔍 Auth storage: Error getting ${key}:`, error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error(`🔍 Auth storage: Error setting ${key}:`, error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`🔍 Auth storage: Error removing ${key}:`, error);
        }
      },
    },
  },
  global: {
    fetch: createFetchWithRetries(2, SUPABASE_TIMEOUT, 1000)
  }
});

// Add custom session refresh logic to help with token refreshing
let refreshInProgress = false;
const refreshSessionWithRetry = async (maxRetries = 3, delay = 1000) => {
  if (refreshInProgress) return;
  refreshInProgress = true;
  
  try {
    let retryCount = 0;
    let success = false;
    
    while (!success && retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`🔒 Retrying session refresh (attempt ${retryCount + 1}/${maxRetries + 1})`);
        }
        const { error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.warn(`⚠️ Session refresh error: ${error.message}`);
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          success = true;
        }
      } catch (e) {
        console.warn(`⚠️ Session refresh exception: ${e instanceof Error ? e.message : String(e)}`);
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    if (!success) {
      console.error('❌ All session refresh attempts failed');
    }
  } finally {
    refreshInProgress = false;
  }
};

// Set up global auth state monitoring
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    // Only log critical auth events
    if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) {
      console.log('🔒 Auth Event:', event, session ? `User: ${session.user?.email || 'unknown'}` : 'No session');
    }
    
    // Try to refresh token when close to expiry
    if (session && event === 'TOKEN_REFRESHED') {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expirationTime = expiresAt * 1000; // convert to milliseconds
        const timeUntilExpiry = expirationTime - Date.now();
        const refreshThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (timeUntilExpiry < refreshThreshold) {
          console.log(`🔍 Token expiring soon (${Math.floor(timeUntilExpiry / 1000)}s), scheduling refresh`);
          // Schedule a refresh, but not immediately
          setTimeout(() => refreshSessionWithRetry(), 1000);
        }
      }
    }
  });
  
  // Try to detect session expiry with page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check if we have a session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const expiresAt = data.session.expires_at;
          if (expiresAt) {
            const expirationTime = expiresAt * 1000; // convert to milliseconds
            const timeUntilExpiry = expirationTime - Date.now();
            
            if (timeUntilExpiry < 60000) { // less than 1 minute
              console.log('🔒 Session expiring soon, refreshing token');
              refreshSessionWithRetry();
            }
          }
        }
      });
    }
  });
}

// Database types for COAI tables
export type Database = {
  public: {
    Tables: {
      'coai-profiles': {
        Row: {
          id: string
          user_id: string
          profile_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          profile_data?: any
        }
        Update: {
          profile_data?: any
        }
      }
      'coai-synths': {
        Row: {
          id: string
          user_id: string
          synth_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          synth_data?: any
        }
        Update: {
          synth_data?: any
        }
      }
      'coai-teams': {
        Row: {
          id: string
          user_id: string
          team_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          team_data?: any
        }
        Update: {
          team_data?: any
        }
      }
      'coai-team-synths': {
        Row: {
          id: string
          team_id: string
          synth_id: string | null
          synth_reference: any
          created_at: string
        }
        Insert: {
          team_id: string
          synth_id?: string | null
          synth_reference?: any
        }
        Update: {
          synth_reference?: any
        }
      }
      'coai-threads': {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          thread_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          team_id?: string | null
          thread_data?: any
        }
        Update: {
          thread_data?: any
        }
      }
      'coai-messages': {
        Row: {
          id: string
          thread_id: string
          message_data: any
          created_at: string
        }
        Insert: {
          thread_id: string
          message_data?: any
        }
        Update: {
          message_data?: any
        }
      }
    }
  }
}

// Development environment validation
if (import.meta.env.DEV && !SUPABASE_ANON_KEY) {
  console.warn('⚠️ SUPABASE_ANON_KEY is not configured');
}

export async function streamChat(messages: any[], role: string, model: string, employeePrompt?: string, employeeName?: string, openaiApiKey?: string) {
  try {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('Supabase anon key is not configured');
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key is required. Please enter your API key in the header.');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ messages, role, model, employeePrompt, employeeName, openaiApiKey }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Chat stream failed: ${response.status} ${response.statusText}` +
        (errorData.error ? ` - ${errorData.error}` : '')
      );
    }

    return response;
  } catch (error) {
    console.error('Stream chat error:', error);
    throw error;
  }
}