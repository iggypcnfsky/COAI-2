# COAI Supabase Backend Implementation Plan

## Overview
This document outlines the implementation plan for the COAI Supabase backend with flexible JSONB-based tables and authentication.

## Architecture Principles

1. **Flexible Schema**: All tables use UUID primary keys and JSONB columns for data storage
2. **Table Prefix**: All tables are prefixed with `coai-` for namespace isolation
3. **Authentication**: Built on Supabase Auth with custom profile management
4. **RLS (Row Level Security)**: Implemented on all tables for data isolation

## Database Design

### Core Tables

#### 1. coai-profiles
Stores user profile information linked to Supabase auth.users
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- profile_data: jsonb
  - displayName: string
  - avatar: string
  - preferences: object
  - metadata: object
- created_at: timestamptz
- updated_at: timestamptz
```

#### 2. coai-synths
Stores AI employees/synths that users create
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to coai-profiles)
- synth_data: jsonb
  - name: string
  - role: string
  - age: number
  - profileImage: string
  - bio: string
  - experience: array
  - systemPrompt: string
  - baseModel: string
  - metadata: object
- created_at: timestamptz
- updated_at: timestamptz
```

#### 3. coai-teams
Stores teams (collections of synths)
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to coai-profiles)
- team_data: jsonb
  - name: string
  - description: string
  - teamImage: string
  - teamType: string (custom/premade)
  - collaborationMode: boolean
  - metadata: object
- created_at: timestamptz
- updated_at: timestamptz
```

#### 4. coai-team-synths
Junction table for team-synth relationships
```sql
- id: uuid (primary key)
- team_id: uuid (foreign key to coai-teams)
- synth_id: uuid (foreign key to coai-synths)
- synth_reference: jsonb
  - synthId: string (can be external ID for premade synths)
  - isCustom: boolean
  - metadata: object
- created_at: timestamptz
```

#### 5. coai-threads
Stores chat threads/conversations
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to coai-profiles)
- team_id: uuid (foreign key to coai-teams, nullable)
- thread_data: jsonb
  - title: string
  - isActive: boolean
  - collaborationMode: boolean
  - metadata: object
- created_at: timestamptz
- updated_at: timestamptz
```

#### 6. coai-messages
Stores individual chat messages
```sql
- id: uuid (primary key)
- thread_id: uuid (foreign key to coai-threads)
- message_data: jsonb
  - content: string
  - sender: string (user/ai)
  - aiEmployee: object (if from AI)
  - image: object (if has attachment)
  - isLoading: boolean
  - metadata: object
- created_at: timestamptz
```

## Implementation Steps

### ✅ Step 1: Install Supabase Dependencies
```bash
npm install @supabase/supabase-js
npm install --save-dev @types/supabase
```

### ✅ Step 2: Create Database Migrations
- ✅ Create initial tables migration (coai_initial_schema)
- ✅ Set up RLS policies (coai_rls_policies)  
- ✅ Create database functions and triggers
- ✅ Applied to Prototyp Club project: hiuinnexazfqhodamhgk

**Database Status:**
- Project URL: https://hiuinnexazfqhodamhgk.supabase.co
- All 6 COAI tables created with RLS enabled
- 23 RLS policies implemented for complete CRUD security
- 16 performance indexes including GIN indexes for JSONB queries

### ✅ Step 3: Setup Authentication Context
- ✅ Create AuthContext provider (`src/lib/auth.tsx`)
- ✅ Implement login/logout functions
- ✅ Handle session persistence
- ✅ Auto-create user profiles

### ✅ Step 4: Create Database Functions
- ✅ Profile management functions
- ✅ Synth CRUD operations
- ✅ Team management (create, update, delete)
- ✅ Team-synth relationships
- ✅ Thread management
- ✅ Message handling
- ✅ Real-time message subscriptions

### ✅ Step 5: Implement TypeScript Types
- ✅ Define interfaces for all JSONB structures (`src/types/index.ts`)
- ✅ Create type-safe database client wrapper (`src/lib/supabase.ts`)
- ✅ Ensure compatibility with existing AIEmployee and Team types
- ✅ Legacy type conversion utilities (`src/lib/database.ts`)

### ✅ Step 6: Create React Hooks
- ✅ useAuth() - Authentication state management
- ✅ useSynths() - Synth CRUD operations
- ✅ useTeams() - Team management
- ✅ useTeamSynths() - Team-synth relationship management
- ✅ useThreads() - Thread management
- ✅ useMessages() - Message handling with real-time updates

### ✅ Step 7: Google OAuth Authentication Implementation
- ✅ Updated auth context with Google sign-in support
- ✅ Added authentication UI to header component (desktop & mobile)
- ✅ Configured Google OAuth scopes for profile picture access
- ✅ Implemented profile picture display with fallback system
- ✅ Fixed duplicate profile creation error handling
- ✅ **Google OAuth Fully Functional**

**Implementation Details:**

1. **OAuth Scopes Configuration:**
   - Added `scopes: 'openid email profile'` to Google OAuth request
   - Ensures Google provides profile pictures and full name data
   - Fixed missing avatar URLs in authentication flow

2. **Profile Creation & Management:**
   - Enhanced profile creation with Google metadata extraction
   - Added duplicate key handling (updates existing profiles on conflict)
   - Automatic profile picture extraction from Google identity data
   - Fallback avatar URL construction using Google provider ID

3. **UI Integration:**
   - Desktop: Google sign-in button next to API key input
   - Mobile: Google auth controls in settings modal
   - Profile picture display with initials fallback
   - Proper loading states and error handling

4. **Authentication Features:**
   - Google sign-in/sign-out functionality
   - Session persistence across page reloads
   - Automatic profile creation from Google account data
   - Real-time authentication state management
   - Profile picture loading with error recovery

**Technical Fixes Applied:**
- ✅ Google OAuth scope configuration for profile data
- ✅ Profile duplicate key error handling (error code 23505)
- ✅ Avatar URL extraction from multiple Google data sources
- ✅ Enhanced debug logging for troubleshooting
- ✅ Responsive UI design for authentication controls

## Security Considerations

### RLS Policies
1. **Profiles**: Users can only read/update their own profile
2. **Synths**: Users can only access their own custom synths
3. **Teams**: Users can access their own teams and public premade teams
4. **Team-Synths**: Access based on team ownership
5. **Threads**: Users can only access their own threads
6. **Messages**: Users can only access messages from their threads

### API Security
- Enable RLS on all tables
- Use Supabase Auth for authentication
- Implement proper CORS policies
- Use environment variables for sensitive data

## Implementation Status

### ✅ Completed Steps
1. ✅ Create Supabase project and get credentials
2. ✅ Implement database migrations
3. ✅ Set up authentication context
4. ✅ Create TypeScript types and interfaces
5. ✅ Implement React hooks for data operations
6. ✅ Add Google OAuth authentication
7. ✅ Configure and test Google OAuth functionality

### 🎯 Implementation Complete
**All 7 core implementation steps have been successfully completed!**

The COAI Supabase backend is now fully functional with:
- ✅ Complete database schema with RLS security
- ✅ Authentication system with Google OAuth
- ✅ Profile picture support and user management
- ✅ Real-time messaging capabilities
- ✅ Type-safe React hooks for all operations
- ✅ Backward compatibility with existing COAI types

### 📈 Future Enhancements
- Add comprehensive error handling and logging
- Create unit tests for critical functions
- Implement data migration utilities
- Add performance monitoring and analytics
- Create admin dashboard for user management 