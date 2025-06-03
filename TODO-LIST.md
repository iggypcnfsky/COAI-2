# COAI Architecture Migration TODO List

This document outlines the specific tasks required to implement the first phase of architecture improvements using Zustand for state management while preserving the existing UI interface.

## Phase 1: Zustand Implementation

### 1. Core Store Setup

- [x] Create `src/stores/index.ts` as the main store entry point
- [x] Define normalized state interfaces in `src/types/store.ts`
- [x] Implement base store with middleware (devtools, persist) in `src/stores/appStore.ts`
- [x] Create utility functions for state normalization in `src/lib/utils/normalization.ts`

### 2. Store Slices Implementation

- [x] **Auth Slice**
  - [x] Create `src/stores/slices/authSlice.ts`
  - [x] Implement authentication state management
  - [x] Add support for temporary API key storage
  - [x] Create migration path from unauthenticated to authenticated

- [x] **Synths Slice**
  - [x] Create `src/stores/slices/synthsSlice.ts`
  - [x] Implement normalized synth state management
  - [x] Add CRUD operations for synths
  - [x] Handle loading states and optimistic updates

- [x] **Teams Slice**
  - [x] Create `src/stores/slices/teamsSlice.ts`
  - [x] Implement normalized team state management
  - [x] Add team-synth relationship tracking
  - [x] Add CRUD operations for teams

- [x] **Threads Slice**
  - [x] Create `src/stores/slices/threadsSlice.ts`
  - [x] Implement normalized thread state management
  - [x] Add active thread selection logic
  - [x] Add thread loading states

- [x] **Messages Slice**
  - [x] Create `src/stores/slices/messagesSlice.ts`
  - [x] Implement normalized message state management
  - [x] Add message pagination support
  - [x] Handle streaming message updates

### 3. Service Layer Development

- [x] Create `src/lib/services/dataService.ts` as base service interface
- [x] ~~Implement `src/lib/services/supabaseService.ts` for authenticated operations~~ (Integrated directly into slices)
- [x] Implement `src/lib/services/directService.ts` for unauthenticated API operations
- [x] Create request caching mechanism in `src/lib/services/cacheService.ts`

### 4. Custom Hooks Creation

- [x] Create `src/hooks/store/useAuth.ts` to replace current auth context
- [x] Create `src/hooks/store/useApiKey.ts` with same API as current apiKeyContext
- [x] Create `src/hooks/store/useSynths.ts` with the same API as current useSynths
- [x] Create `src/hooks/store/useTeams.ts` with the same API as current useTeams
- [x] Create `src/hooks/store/useThreads.ts` for thread management
- [x] Create `src/hooks/store/useThreadSynths.ts` to replace current useThreadSynths
- [x] Create `src/hooks/store/useMessages.ts` for message management
- [x] Create `src/hooks/store/index.ts` to export all store hooks
- [x] Update `src/hooks/index.ts` to include store hooks

### 5. Component Migration

- [x] **Core Components**
  - [x] Update `src/lib/auth.tsx` to use Zustand auth store
  - [x] Update `src/lib/apiKeyContext.tsx` to use Zustand store

- [x] **Layout Components**
  - [x] Refactor `src/components/layout/Layout.tsx` to use new hooks
  - [x] Keep the same props interface for backwards compatibility

- [x] **Browser Components**
  - [x] Update `src/components/browser/BrowserPanel.tsx` to use Zustand hooks
  - [x] Refactor card components to consume normalized state

- [x] **Chat Components**
  - [x] Update `src/components/chat/ChatSection.tsx` to use message store
  - [x] Implement streaming with Zustand for real-time updates

### 6. Testing and Validation

- [x] Fix sign-out functionality to properly handle timeouts and session clearing
- [x] Fix infinite update loop in Chat components with Zustand integration
- [ ] Create unit tests for Zustand store in `src/stores/__tests__/`
- [ ] Add integration tests for key user flows
- [ ] Validate performance with React DevTools Profiler
- [ ] Test authentication-optional workflow

## Phase 2: Feature Parity Validation

- [ ] Verify all existing functionality works with new architecture
- [ ] Ensure unauthenticated usage works as expected
- [ ] Validate that UI remains unchanged
- [ ] Document any edge cases or issues discovered

## Preparing for Legacy Code Cleanup

Before proceeding with Phase 3, validate that the Zustand implementation is ready for the full transition:

### Component State Audit
1. Create a list of all components still using React's useState/useContext
2. Identify which components can be immediately refactored vs. which need more careful migration
3. Map out data flow to ensure no unexpected side effects from removing legacy state

### Performance Baseline
1. Measure current application performance metrics:
   - Thread switching time
   - Message sending latency
   - UI responsiveness under load
2. Use React DevTools Profiler to identify problem areas
3. Document baseline metrics for comparison after cleanup

### Testing Strategy
1. Create regression tests for key user flows:
   - Authentication flow (sign in, sign out)
   - Synth creation and management
   - Team creation and management
   - Chat functionality (sending messages, streaming responses)
2. Develop automated tests for critical components using Vitest
3. Establish manual testing checklist for UI validation

### Documentation Review
1. Review all existing documentation for accuracy
2. Identify sections that will need updates after cleanup
3. Prepare updated architecture diagrams reflecting the new data flow

## Phase 3: Legacy Code Cleanup

- [ ] Remove redundant state management code
  - [x] Replace ThreadContext with useThreads from Zustand
  - [x] Remove any remaining useState/useContext state management in components (browser component)
  - [x] Clean up any duplicate state tracking in components that's now in Zustand

- [ ] Clean up temporary compatibility layers
  - [x] Refactor any wrapper components that were created for backward compatibility (apiKeyContext)
  - [x] Remove compatibility helper functions in hooks
  - [ ] Ensure direct store access is used instead of legacy abstractions

- [ ] Refactor remaining components to use Zustand directly
  - [ ] Update profile components to use store hooks
  - [ ] Refactor settings components to use store hooks
  - [x] Convert any remaining chat UI components to use Zustand
  - [x] Update browser components that still use legacy state (FilesSection completed)

- [ ] Performance optimization
  - [ ] Add proper selectors to minimize re-renders
  - [ ] Implement useCallback/useMemo where appropriate
  - [ ] Review component render cycles with React DevTools

- [ ] Update documentation to reflect new architecture
  - [ ] Update README.md with new architecture overview
  - [ ] Add store documentation in the codebase
  - [ ] Document migration patterns for future components
  - [ ] Create a state management guide for developers

- [ ] Code cleanup
  - [ ] Remove test component code from TODO-LIST.md
  - [ ] Remove commented-out legacy state management code
  - [ ] Fix any TypeScript errors related to the new architecture
  - [ ] Ensure proper error handling throughout the application
  - [x] Reduce excessive debug logging in auth and API operations
  - [x] Remove unused video functionality from EmployeeCard component
  - [x] Fix "Cannot convert undefined or null to object" error in Files tab
  - [x] Update fetch logic to get public synths and teams from Supabase instead of static files
  - [x] Add privacy toggles for synths and teams in creation and edit modals
  - [x] Update API utility functions to get API keys from Zustand store instead of localStorage
  - [x] Update image generation to save files to Supabase Storage instead of returning base64 data
  - [x] Fix synth ordering in browser to show most recently created synths at the top
  - [x] Fix team ordering in browser to show most recently created teams at the top

## References

- Architecture Plan: See `ARCHITECTURE.md`
- UI Interface Documentation: See `INTERFACE.md`

