import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://hiuinnexazfqhodamhgk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWlubmV4YXpmcWhvZGFtaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzU3MDIsImV4cCI6MjA0NTExMTcwMn0.iLC9JDOaaGZbsMMwTOZOCfFDdvkVZIvKU41CFoaicx0';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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