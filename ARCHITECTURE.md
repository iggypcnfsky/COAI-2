# COAI Application Architecture Redesign

This document outlines a new architectural approach for the COAI application, focusing on creating a more robust, predictable, and performant data flow.

## 1. Current Pain Points

The existing architecture suffers from several issues:

- **Scattered State Management**: State is spread across multiple components using useState and useContext
- **Synchronization Problems**: Changes in one part of the application don't reliably propagate
- **Excessive Re-rendering**: Components re-render unnecessarily, affecting performance
- **Complex Data Update Logic**: Updating nested data structures is error-prone
- **Inadequate Loading States**: Operations like thread switching lack proper loading indicators
- **Buggy Transitions**: Thread switching and other state transitions are unreliable
- **Performance Issues**: The application feels slow during data operations

## 2. New Architecture Principles

### 2.1 Centralized State Management

We will implement a global state management solution that serves as the single source of truth for all application data.

Key characteristics:
- **Normalized Data Storage**: Data will be stored in a flat, normalized structure
- **Atomic State Updates**: Changes to state will be atomic and predictable
- **Selective Subscriptions**: Components will subscribe only to the data they need

### 2.2 Unidirectional Data Flow

The application will follow a strict unidirectional data flow pattern:

```
Action → State Update → UI Update
```

This ensures that:
- Data flow is predictable and traceable
- State changes are explicitly triggered through actions
- UI updates are a direct result of state changes

### 2.3 Data Access Layer

We will introduce a data access layer that abstracts interaction with Supabase:

- **Service Layer**: Handles all API calls and data transformations
- **State Adapters**: Convert between API and state representations
- **Caching Layer**: Implements intelligent caching for improved performance

### 2.4 Asynchronous Operation Management

Proper handling of asynchronous operations:

- **Request Lifecycle States**: Every async operation will have loading, success, error states
- **Request Cancellation**: Ability to cancel in-flight requests when context changes
- **Automatic Retry**: Configurable retry logic for failed operations
- **Optimistic Updates**: Apply updates locally before server confirmation

### 2.5 Performance Optimization

Built-in performance optimizations:

- **Memoization**: Prevent unnecessary recalculations
- **Request Deduplication**: Avoid duplicate API calls
- **Selective Rendering**: Components only re-render when relevant data changes
- **Virtualization**: Efficiently render large data sets (like message lists)

### 2.6 Authentication-Optional Architecture

A critical requirement for the application is supporting users who are not logged in. The architecture will:

- **Support Pre-Authentication Usage**: Allow full application functionality without requiring login
- **Client-Side API Key Storage**: Temporarily store user-provided API keys in memory (never in localStorage)
- **Seamless Transition**: Provide smooth migration path from unauthenticated to authenticated state
- **Feature Parity**: Ensure core features work identically for both authenticated and unauthenticated users

This allows potential users to test the application with their own API keys before committing to creating an account.

## 3. Technical Implementation

### 3.1 State Management Library

We will implement our state management using **Zustand**:

- Lightweight and simple API
- Flexible middleware support
- Excellent TypeScript integration
- Performance-focused with minimal re-renders
- Compatible with React hooks
- Easy debugging with Redux DevTools

### 3.2 Data Normalization Strategy

All entities will be normalized following this pattern:

```typescript
interface NormalizedState {
  entities: {
    users: Record<string, User>;
    synths: Record<string, Synth>;
    teams: Record<string, Team>;
    threads: Record<string, Thread>;
    messages: Record<string, Message>;
  };
  relationships: {
    teamSynths: Record<string, string[]>;
    threadMessages: Record<string, string[]>;
    // etc.
  };
  ui: {
    activeTeamId: string | null;
    activeThreadId: string | null;
    loadingStates: Record<string, boolean>;
    errors: Record<string, Error | null>;
  };
}
```

### 3.3 Service Layer Implementation

The service layer will handle all interaction with Supabase:

```typescript
interface DataService {
  // Teams
  fetchTeams(): Promise<Team[]>;
  createTeam(team: TeamInput): Promise<Team>;
  updateTeam(id: string, changes: Partial<Team>): Promise<Team>;
  
  // Threads
  fetchThreads(teamId: string): Promise<Thread[]>;
  createThread(thread: ThreadInput): Promise<Thread>;
  switchThread(threadId: string): Promise<void>;
  
  // Messages
  fetchMessages(threadId: string, options?: PaginationOptions): Promise<Message[]>;
  sendMessage(message: MessageInput): Promise<Message>;
  // etc.
}
```

### 3.4 React Integration

Components will interact with the state using custom hooks:

```typescript
// Example hooks
const useTeams = () => {
  const teams = useStore(state => state.entities.teams);
  const teamIds = useStore(state => Object.keys(teams));
  const isLoading = useStore(state => state.ui.loadingStates.teams);
  
  return {
    teams: teamIds.map(id => teams[id]),
    isLoading
  };
};

const useActiveThread = () => {
  const activeThreadId = useStore(state => state.ui.activeThreadId);
  const thread = useStore(state => 
    activeThreadId ? state.entities.threads[activeThreadId] : null
  );
  const isLoading = useStore(state => state.ui.loadingStates.activeThread);
  
  return { thread, isLoading, activeThreadId };
};
```

### 3.5 Authentication-Optional Implementation

The implementation will include:

```typescript
// Store structure supporting non-authenticated users
interface AppState {
  auth: {
    session: Session | null;
    isAuthenticated: boolean;
    tempApiKeys: {
      openai?: string;
      // other provider keys as needed
    };
  };
  // ... other state
}

// API service that works with or without authentication
class ApiService {
  constructor(private store: Store) {}
  
  async callApi(endpoint: string, params: any) {
    const { isAuthenticated, tempApiKeys } = this.store.getState().auth;
    
    if (isAuthenticated) {
      // Use Supabase edge functions with session token
      return this.callAuthenticatedApi(endpoint, params);
    } else {
      // Use direct API calls with user-provided keys
      return this.callUnauthenticatedApi(endpoint, params, tempApiKeys);
    }
  }
  
  // Implementation details...
}
```

Key differences in unauthenticated mode:

1. **Data Persistence**: No data persisted to database
2. **API Processing**: Requests processed client-side or via stateless edge functions
3. **Session Management**: In-memory only session state
4. **Migration Path**: Option to create account and persist current state to database

## 4. Implementation Tasks

### 4.1 Foundation Tasks

1. **Set up Zustand Store**
   - Create base store structure
   - Define TypeScript interfaces
   - Implement middleware (persist, devtools)

2. **Create Data Normalization Utilities**
   - Implement normalization functions
   - Create selector utilities
   - Build relationship management functions

3. **Design Service Layer**
   - Create base service interface
   - Implement Supabase adapter
   - Add caching mechanism

### 4.2 Feature Implementation

4. **User Authentication**
   - Integrate auth state with Zustand
   - Implement session management
   - Add auth state persistence
   - **Support unauthenticated usage with API keys**
   - **Create migration path from unauthenticated to authenticated**

5. **Teams Management**
   - Implement team CRUD operations
   - Create team selection logic
   - Build team UI components

6. **Threads Management**
   - Implement thread CRUD operations
   - Create thread switching logic with loading states
   - Build thread UI components

7. **Messages Management**
   - Implement message fetching with pagination
   - Create message sending with optimistic updates
   - Add real-time updates for new messages

8. **Synths & Profiles**
   - Implement synth management
   - Create profile handling
   - Build related UI components

### 4.3 Performance & UX Improvements

9. **Loading States & Error Handling**
   - Implement global loading state management
   - Create error handling utilities
   - Build UI components for loading and error states

10. **Virtualization**
    - Implement virtualized lists for messages
    - Add lazy loading for images
    - Optimize rendering for large data sets

11. **Caching Strategy**
    - Implement request deduplication
    - Add time-based cache invalidation
    - Create prefetching mechanism for common operations

### 4.4 Migration Strategy

12. **Component Migration Planning**
    - Create component migration priority list
    - Design interface compatibility layer
    - Plan gradual rollout strategy

13. **Parallel Implementation**
    - Build new components alongside existing ones
    - Implement feature flags for gradual rollout
    - Create testing strategy for new architecture

14. **Final Transition**
    - Switch to new architecture components
    - Remove legacy state management
    - Verify application performance and stability

### 4.5 Authentication-Optional Tasks

15. **Unauthenticated Mode**
    - Implement in-memory API key management
    - Create stateless API processing pathway
    - Build UI for API key entry and management
    - Implement feature detection based on provided keys

16. **Auth State Migration**
    - Develop data migration from memory to database on signup/login
    - Create seamless authentication transition
    - Build persistent state reconciliation

## 5. Evaluation Metrics

To measure the success of our architectural redesign:

1. **Performance Metrics**
   - Thread switching time (should be < 200ms)
   - Message sending latency
   - UI responsiveness under load

2. **Code Quality Metrics**
   - Reduced bug reports related to state management
   - Decreased complexity in components
   - Improved test coverage

3. **Developer Experience**
   - Reduced time to implement new features
   - Improved debugging capabilities
   - More consistent coding patterns

### 5.4 Authentication-Optional Metrics

- **Conversion Rate**: Percentage of unauthenticated users who create accounts
- **Pre-Auth Usage Time**: Average time users spend in unauthenticated mode
- **Feature Usage**: Which features are most used by unauthenticated users
- **API Key Entry Completion**: Percentage of visitors who successfully enter API keys

## 6. Timeline

- **Phase 1 (Foundation)**: Tasks 1-3 (2 weeks)
- **Phase 2 (Core Features)**: Tasks 4-8 (3 weeks)
- **Phase 3 (Optimization)**: Tasks 9-11 (2 weeks)
- **Phase 4 (Migration)**: Tasks 12-14 (3 weeks)

Total timeline: ~10 weeks for complete transition 

## 7. Database Schema

The following schema outlines the optimized database structure for the COAI application, designed for maximum modularity and simplicity.

### 7.1 Core Tables

#### `coai-profiles`
```
CREATE TABLE "coai-profiles" (
  id UUID PRIMARY KEY REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains all profile information including:
- email
- display_name
- avatar_url
- settings
- onboarding_status

#### `coai-synths`
```
CREATE TABLE "coai-synths" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES "coai-profiles"(id),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains all synth information including:
- name
- description
- avatar_url
- is_public
- prompt
- configuration
- metadata

#### `coai-teams`
```
CREATE TABLE "coai-teams" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES "coai-profiles"(id),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains all team information including:
- name
- description
- is_public
- image_url
- configuration
- metadata

#### `coai-team-synths`
```
CREATE TABLE "coai-team-synths" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES "coai-teams"(id),
  synth_id UUID NOT NULL REFERENCES "coai-synths"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains relationship information including:
- role
- configuration

#### `coai-threads`
```
CREATE TABLE "coai-threads" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES "coai-profiles"(id),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains all thread information including:
- title
- is_pinned
- last_message_at
- synth_ids (array of synth IDs participating in this thread)
- metadata

#### `coai-messages`
```
CREATE TABLE "coai-messages" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES "coai-threads"(id),
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains all message information including:
- content
- is_deleted
- attachments
- metadata (reactions, etc.)

#### `coai-documents`
```
CREATE TABLE "coai-documents" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "coai-profiles"(user_id),
  document_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The `document_data` field contains all document information including:
- title
- content
- type (text, markdown, code, note)
- tags
- metadata

### 7.2 Supporting Tables

#### `coai-user-teams`
```
CREATE TABLE "coai-user-teams" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "coai-profiles"(id),
  team_id UUID NOT NULL REFERENCES "coai-teams"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains membership information including:
- role
- status

#### `coai-api-keys`
```
CREATE TABLE "coai-api-keys" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "coai-profiles"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains key information including:
- service
- encrypted_key

#### `coai-user-activities`
```
CREATE TABLE "coai-user-activities" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "coai-profiles"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

The `data` field contains activity information including:
- activity_type
- activity-specific metadata

### 7.3 Schema Benefits

This optimized schema provides several advantages:

1. **Maximum Flexibility**: The JSONB `data` field can accommodate changing requirements without schema modifications
2. **Schema Evolution**: New properties can be added without migrations
3. **Simplified Queries**: Common patterns for accessing all entities
4. **Performance**: Only essential fields are indexed
5. **Maintainability**: Consistent structure across all tables
6. **Clear Separation**: Teams and Threads are completely independent entities

### 7.4 Indexes and Performance Considerations

```sql
-- For efficient message retrieval by thread
CREATE INDEX idx_messages_thread_created ON "coai-messages" (thread_id, created_at);

-- For retrieving team synths
CREATE INDEX idx_team_synths_team ON "coai-team-synths" (team_id);

-- For retrieving user teams
CREATE INDEX idx_user_teams_user ON "coai-user-teams" (user_id);

-- For message sender lookups
CREATE INDEX idx_messages_sender ON "coai-messages" (sender_id, sender_type);

-- For efficient document retrieval by user
CREATE INDEX idx_coai_documents_user_id ON "coai-documents" (user_id);
CREATE INDEX idx_coai_documents_created_at ON "coai-documents" (created_at);
CREATE INDEX idx_coai_documents_updated_at ON "coai-documents" (updated_at);

-- For JSONB data queries on commonly accessed fields
CREATE INDEX idx_threads_last_message ON "coai-threads" USING GIN ((data->>'last_message_at'));
CREATE INDEX idx_synths_public ON "coai-synths" USING GIN ((data->>'is_public'));
CREATE INDEX idx_documents_title ON "coai-documents" USING GIN ((document_data->>'title'));
CREATE INDEX idx_documents_type ON "coai-documents" USING GIN ((document_data->>'type'));
```

### 7.5 Data Access Patterns

With this schema, data access follows consistent patterns:

```typescript
// Fetch a profile with all its data
const profile = await supabase
  .from('coai-profiles')
  .select('*')
  .eq('id', profileId)
  .single();

// Update profile data (partial update)
await supabase
  .from('coai-profiles')
  .update({ 
    updated_at: new Date(),
    data: { 
      ...profile.data,
      display_name: 'New Name'
    }
  })
  .eq('id', profileId);

// Query using JSONB fields
const publicSynths = await supabase
  .from('coai-synths')
  .select('*')
  .eq('data->>is_public', true);

// Fetch user documents
const documents = await supabase
  .from('coai-documents')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

// Create a new document
await supabase
  .from('coai-documents')
  .insert({
    user_id: userId,
    document_data: {
      title: 'My Document',
      content: 'Document content...',
      type: 'markdown',
      tags: ['work', 'notes']
    }
  });
```

### 7.6 Entity Relationships

Key relationships in the data model:

1. **Users and Profiles**
   - Each user has exactly one profile (1:1)

2. **Users and Synths**
   - Users can create multiple synths (1:many)
   - Synths are created by exactly one user

3. **Users and Teams** 
   - Users can create multiple teams (1:many)
   - Teams are created by exactly one user

4. **Teams and Synths**
   - Teams can contain multiple synths (many:many via `coai-team-synths`)
   - Synths can belong to multiple teams

5. **Users and Threads**
   - Users can create multiple threads (1:many)
   - Threads are created by exactly one user

6. **Threads and Messages**
   - Threads contain multiple messages (1:many)
   - Messages belong to exactly one thread

7. **Threads and Synths** 
   - Threads involve one or more synths (stored as synth_ids array in thread data)
   - No direct relationship between teams and threads

8. **Users and Documents**
   - Users can create multiple documents (1:many)
   - Documents are created by exactly one user
   - Documents are independent entities not tied to teams or threads 

### 7.7 Authentication-Optional Considerations

For unauthenticated users:

1. **No Database Storage**: Data exists only in client memory during the session
2. **API Key Handling**: 
   - API keys stored in memory only (never in localStorage or cookies)
   - Keys transmitted securely in request headers when needed
   - All API key handling removed on session end
3. **State Migration**:
   - When user creates an account, current in-memory state is persisted to database
   - This includes synths, teams, threads, and messages created during unauthenticated session 