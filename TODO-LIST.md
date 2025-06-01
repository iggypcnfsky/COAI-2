# COAI Architecture Migration TODO List

This document outlines the specific tasks required to implement the first phase of architecture improvements using Zustand for state management while preserving the existing UI interface.

## Phase 1: Zustand Implementation

### 1. Core Store Setup

- [] Create `src/stores/index.ts` as the main store entry point
- [] Define normalized state interfaces in `src/types/store.ts`
- [] Implement base store with middleware (devtools, persist) in `src/stores/appStore.ts`
- [] Create utility functions for state normalization in `src/lib/utils/normalization.ts`

### 2. Store Slices Implementation

- [] **Auth Slice**
  - [] Create `src/stores/slices/authSlice.ts`
  - [] Implement authentication state management
  - [] Add support for temporary API key storage
  - [] Create migration path from unauthenticated to authenticated

- [] **Synths Slice**
  - [] Create `src/stores/slices/synthsSlice.ts`
  - [] Implement normalized synth state management
  - [] Add CRUD operations for synths
  - [] Handle loading states and optimistic updates

- [] **Teams Slice**
  - [] Create `src/stores/slices/teamsSlice.ts`
  - [] Implement normalized team state management
  - [] Add team-synth relationship tracking
  - [] Add CRUD operations for teams

- [] **Threads Slice**
  - [] Create `src/stores/slices/threadsSlice.ts`
  - [] Implement normalized thread state management
  - [] Add active thread selection logic
  - [] Add thread loading states

- [] **Messages Slice**
  - [] Create `src/stores/slices/messagesSlice.ts`
  - [] Implement normalized message state management
  - [] Add message pagination support
  - [] Handle streaming message updates

### 3. Service Layer Development

- [] Create `src/lib/services/dataService.ts` as base service interface
- [] ~~Implement `src/lib/services/supabaseService.ts` for authenticated operations~~ (Integrated directly into slices)
- [] Implement `src/lib/services/directService.ts` for unauthenticated API operations
- [] Create request caching mechanism in `src/lib/services/cacheService.ts`

### 4. Custom Hooks Creation

- [] Create `src/hooks/store/useAuth.ts` to replace current auth context
- [] Create `src/hooks/store/useApiKey.ts` with same API as current apiKeyContext
- [] Create `src/hooks/store/useSynths.ts` with the same API as current useSynths
- [] Create `src/hooks/store/useTeams.ts` with the same API as current useTeams
- [] Create `src/hooks/store/useThreads.ts` for thread management
- [] Create `src/hooks/store/useThreadSynths.ts` to replace current useThreadSynths
- [] Create `src/hooks/store/useMessages.ts` for message management

### 5. Component Migration

- [] **Core Components**
  - [] Update `src/lib/auth.tsx` to use Zustand auth store
  - [] Update `src/lib/apiKeyContext.tsx` to use Zustand store

- [ ] **Layout Components**
  - [ ] Refactor `src/components/layout/Layout.tsx` to use new hooks
  - [ ] Keep the same props interface for backwards compatibility

- [ ] **Browser Components**
  - [ ] Update `src/components/browser/BrowserPanel.tsx` to use Zustand hooks
  - [ ] Refactor card components to consume normalized state

- [ ] **Chat Components**
  - [ ] Update `src/components/chat/ChatSection.tsx` to use message store
  - [ ] Implement streaming with Zustand for real-time updates

### 6. Testing and Validation

- [ ] Create unit tests for Zustand store in `src/stores/__tests__/`
- [ ] Add integration tests for key user flows
- [ ] Validate performance with React DevTools Profiler
- [ ] Test authentication-optional workflow

## Phase 2: Feature Parity Validation

- [ ] Verify all existing functionality works with new architecture
- [ ] Ensure unauthenticated usage works as expected
- [ ] Validate that UI remains unchanged
- [ ] Document any edge cases or issues discovered

## Phase 3: Legacy Code Cleanup

- [ ] Remove redundant state management code
- [ ] Clean up any temporary compatibility layers
- [ ] Refactor remaining components to use Zustand directly
- [ ] Update documentation to reflect new architecture

## References

- Architecture Plan: See `ARCHITECTURE.md`
- UI Interface Documentation: See `INTERFACE.md` 