# COAI Supabase Backend Setup Guide

## Overview

This guide will walk you through setting up the complete Supabase backend for COAI with user authentication, synth management, team creation, and thread-based messaging.

## Database Architecture

```
Users (auth.users) 
    ↓
coai-profiles (user profile data)
    ↓
coai-synths (custom AI personalities)
    ↓
coai-teams (collections of synths)
    ↓
coai-team-synths (junction table)
    ↓
coai-threads (chat conversations)
    ↓
coai-messages (individual messages)
```

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key
4. Go to Settings > API and copy:
   - Project URL
   - Anon (public) key
   - Service role key (for migrations)

## Step 2: Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Run Database Migrations

Using Supabase CLI (recommended):

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your_project_ref

# Apply migrations
supabase db push
```

Or manually run the SQL files in Supabase Dashboard:
1. Go to SQL Editor in Supabase Dashboard
2. Run `001_initial_schema.sql`
3. Run `002_rls_policies.sql`

## Step 4: Configure Authentication

In Supabase Dashboard → Authentication → Settings:

1. **Enable Email/Password auth** (enabled by default)
2. **Configure email templates** (optional)
3. **Set up OAuth providers** (Google, GitHub, etc. - optional)

## Step 5: Test Database Setup

Run this SQL in the SQL Editor to verify everything works:

```sql
-- Test profile creation
INSERT INTO "coai-profiles" (user_id, profile_data) 
VALUES (
    auth.uid(),
    '{"displayName": "Test User", "avatar": "default.png"}'::jsonb
);

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'coai-%';
```

## Step 6: Frontend Integration

### Create Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (generated)
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
          profile_data: any
        }
        Update: {
          profile_data?: any
        }
      }
      // Add other table types...
    }
  }
}
```

### Authentication Hook

Create `src/hooks/useAuth.ts`:

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    signIn: (email: string, password: string) => 
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) => 
      supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }
}
```

## Step 7: Data Migration from LocalStorage

### Migration Hook

Create `src/hooks/useMigrateToSupabase.ts`:

```typescript
export function useMigrateToSupabase() {
  const migrateLocalData = async () => {
    // Migrate custom synths
    const customSynths = localStorage.getItem('coai-custom-synths')
    if (customSynths) {
      const synths = JSON.parse(customSynths)
      // Insert into coai-synths table
    }

    // Migrate custom teams
    const customTeams = localStorage.getItem('coai-custom-teams')
    if (customTeams) {
      const teams = JSON.parse(customTeams)
      // Insert into coai-teams and coai-team-synths tables
    }

    // Migrate messages and teams
    const messages = localStorage.getItem('coai-messages')
    if (messages) {
      // Convert to thread-based structure
    }
  }

  return { migrateLocalData }
}
```

## Step 8: Testing

### Test Authentication
1. Create test user account
2. Verify profile is created automatically
3. Test login/logout flow

### Test Data Operations
1. Create a custom synth
2. Create a team with synths
3. Start a thread
4. Send messages

### Test RLS Policies
1. Try to access another user's data (should fail)
2. Verify own data is accessible
3. Test all CRUD operations

## Step 9: Production Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Authentication working
- [ ] Data migration from localStorage complete
- [ ] Error handling implemented
- [ ] Performance optimization (indexes working)
- [ ] Backup strategy in place

## Troubleshooting

### Common Issues

1. **RLS Policies Blocking Operations**
   - Check if user is authenticated
   - Verify policy conditions
   - Test with service role key

2. **Foreign Key Violations**
   - Ensure referenced records exist
   - Check user_id matches auth.uid()

3. **JSONB Validation Errors**
   - Validate JSON structure before insert
   - Use proper type casting

4. **Migration Errors**
   - Check SQL syntax
   - Ensure dependencies exist
   - Run migrations in order

### Useful SQL Queries

```sql
-- Check current user
SELECT auth.uid();

-- View all profiles
SELECT * FROM "coai-profiles";

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename LIKE 'coai-%';

-- Clear test data
DELETE FROM "coai-messages";
DELETE FROM "coai-threads";
DELETE FROM "coai-team-synths";
DELETE FROM "coai-teams";
DELETE FROM "coai-synths";
DELETE FROM "coai-profiles";
```

## Next Steps

1. Implement React hooks for each table
2. Replace localStorage persistence with Supabase
3. Add real-time subscriptions for live updates
4. Implement proper error handling
5. Add data validation and sanitization
6. Set up automated backups 