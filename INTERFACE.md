# COAI Interface Documentation

This document provides a comprehensive overview of the COAI application's user interface architecture, components, and design principles.

## Table of Contents

1. [Overall Architecture](#overall-architecture)
2. [Core UI Components](#core-ui-components)
3. [Layout Structure](#layout-structure)
4. [Navigation System](#navigation-system)
5. [Chat Interface](#chat-interface)
6. [Browser Panel](#browser-panel)
7. [Profile Sections](#profile-sections)
8. [Design System](#design-system)
9. [UI Interactions](#ui-interactions)
10. [Component Hierarchy](#component-hierarchy)
11. [State Management](#state-management)
12. [Data Flow](#data-flow)
13. [Supabase Integration](#supabase-integration)
14. [API Structure](#api-structure)
15. [File Organization](#file-organization)

## Overall Architecture

The COAI application uses a component-based architecture built with React and TypeScript. The UI follows a modular approach where different sections of the application are encapsulated in reusable components.

### Key Design Principles

- **Modularity**: Components are organized by functionality and can be easily reused across the application.
- **Responsiveness**: The interface adapts to different screen sizes and devices.
- **Consistency**: Common UI patterns and components are reused throughout the application.
- **Accessibility**: The application follows accessibility best practices.

### Technology Stack

- **React**: Frontend library for building the user interface
- **TypeScript**: For type-safe code
- **Tailwind CSS**: For styling components
- **Shadcn/UI**: Component library providing the foundational UI elements
- **Supabase**: Backend service for authentication, database, and storage

## Core UI Components

The application is built using a set of reusable UI components from a custom component library located in `src/components/ui/`. These components include:

- **Basic Controls**: Button, Input, Textarea, Checkbox, Select, etc.
- **Navigation**: Tabs, Breadcrumb, Navigation Menu, etc.
- **Feedback**: Alert, Toast, Dialog, Sonner, etc.
- **Layout**: Card, Accordion, Collapsible, Separator, etc.
- **Data Display**: Table, Avatar, Badge, etc.
- **Overlay**: Dialog, Drawer, Popover, Tooltip, etc.

### Component Extensions

Many of the base UI components are extended to create application-specific components:

- **Avatar**: Extended to display user and synth profile images
- **Card**: Used as base for EmployeeCard, SynthCard, and TeamCard
- **Dialog**: Extended for various modal interfaces like CreateSynthModal

## Layout Structure

The application's main layout is defined in `src/components/layout/Layout.tsx`, which serves as the container for all other components. The layout is organized into several main sections:

```
+-------------------------------------+
|              Header                 |
+----------+----------------------+---+
|          |                      |   |
| Browser  |      Chat Section    |   |
| Panel    |                      |   |
|          |                      |   |
|          |                      |   |
|          |                      |   |
+----------+----------------------+---+
|          |                      |   |
|  Teams   |                      |   |
| Section  |                      |   |
|          |                      |   |
+----------+----------------------+---+
```

### Header Component

The header (`src/components/layout/Header.tsx`) contains:
- Application logo
- Navigation controls
- User profile information
- Settings and authentication controls

### Layout Responsiveness

The layout is responsive and adapts to different screen sizes:
- On larger screens, all panels are visible side by side
- On medium screens, panels can be collapsed to provide more space for the chat
- On mobile devices, a single-panel view with navigation to switch between sections

## Navigation System

The application uses a multi-panel navigation system:

1. **Tabs Navigation**: Used for switching between major sections (Teams, Synths, Files).
2. **Left Sidebar**: Browser panel for browsing and selecting synths, teams, and files.
3. **Context Menus**: For additional actions on each item.
4. **Modal Dialogs**: For creation and editing operations.

### Navigation Patterns

- **Hierarchical Navigation**: From teams to individual synths
- **Contextual Navigation**: Actions relevant to the current selection
- **Direct Access**: Search functionality to quickly find items
- **Workflow Navigation**: Guided flows for creation and configuration tasks

## Browser Panel

The Browser Panel (`src/components/browser/BrowserPanel.tsx`) is a key component for navigation and content management. It includes:

### Tabs
- Teams: Displays premade and custom teams
- Synths: Shows AI employees and custom synths
- Files: Displays documents and resources

### Action Buttons
- Create New Synth
- Create New Team
- Upload Files

### Cards
- EmployeeCard: For displaying individual AI employees
- CustomSynthCard: For user-created synths
- TeamCard: For premade teams
- CustomTeamCard: For user-created teams

### State and Interactions
- Cards support selection to display in the profile section
- Drag and drop functionality to add to conversations
- Quick-add buttons for immediate interaction
- Loading states for asynchronous operations like synth creation

## Chat Interface

The chat interface (`src/components/chat/ChatSection.tsx`) is the main interaction area where users communicate with synths. Key components include:

### Chat Components
- **ChatMessage**: Individual message component supporting text, images, and markdown
- **MessageInputWithMentions**: Advanced input for sending messages with mentions
- **MarkdownRenderer**: Renders markdown content in messages
- **TeamMembersList**: Shows the current participants in the conversation
- **YourChatsSection**: Lists all chat threads

### Features
- Drag and drop for adding team members
- Document attachment and sharing
- Message streaming with visual feedback
- Automatic scrolling with manual override detection
- AI message continuation with spacebar

### Message Structure
Messages in the chat interface follow a specific structure:
- User messages: Right-aligned with user avatar
- AI messages: Left-aligned with synth avatar
- System messages: Centered with distinctive styling
- Rich content support: Markdown, code blocks, images, file attachments

## Profile Sections

The application includes several profile components:

- **ProfileSection**: Displays information about selected synths
- **TeamProfile**: Shows details about a selected team
- **CustomTeamProfile**: For user-created teams with additional editing options

### Profile Data Display
Each profile section displays:
- Profile image or team image
- Name and description
- Metadata (role, expertise, etc.)
- Action buttons relevant to the entity type

## Design System

The application uses a custom design system based on shadcn/ui components with Tailwind CSS for styling. The components are highly customizable and follow a consistent design language.

### Color System
- Primary colors for branding and key actions
- Neutral colors for text and backgrounds
- Accent colors for highlighting and emphasis
- Status colors for feedback (success, error, warning, info)

### Typography
- Sans-serif font family for general text
- Consistent heading hierarchy
- Text sizes optimized for readability

### Spacing and Layout
- Consistent padding and margins
- Grid-based layout
- Responsive breakpoints

### Component Variants
UI components often have multiple variants:
- **Buttons**: Primary, secondary, outline, ghost, destructive
- **Cards**: Default, interactive, compact
- **Inputs**: Default, with validation, with icons

## UI Interactions

The application supports various interaction patterns:

### Drag and Drop
- Drag synths to a conversation
- Drag teams to quickly add all members
- Drag documents to share in chat

### Modal Workflows
- Create and edit synths
- Create and edit teams
- Upload and manage files

### Real-time Feedback
- Streaming chat responses
- Loading indicators
- Toast notifications

### Keyboard Shortcuts
- Spacebar to continue AI responses
- Keyboard navigation
- Shortcut keys for common actions

## Component Hierarchy

The application follows a hierarchical component structure:

```
App
├── Layout
│   ├── Header
│   ├── BrowserPanel
│   │   ├── Tabs (Teams, Synths, Files)
│   │   ├── EmployeeCard / CustomSynthCard
│   │   ├── TeamCard / CustomTeamCard
│   │   └── FilesSection
│   ├── ChatSection
│   │   ├── TeamMembersList
│   │   ├── ChatMessage
│   │   ├── MessageInputWithMentions
│   │   └── YourChatsSection
│   └── ProfileSection / TeamProfile / CustomTeamProfile
├── Modal Components
│   ├── CreateSynthModal
│   ├── EditSynthModal
│   ├── CreateTeamModal
│   └── EditTeamModal
└── Utility Components
    ├── MarkdownRenderer
    ├── FileMentionBadge
    └── MentionBadge
```

### Component Communication

Components communicate through:
- Props for parent-child communication
- Callback functions for child-parent communication
- Context API for shared state across components
- Custom hooks for reusable logic and state

## State Management

The application uses several approaches to state management:

### Local Component State
- UI state (e.g., which tab is active, is a modal open)
- Form state (e.g., input values, validation errors)
- Interaction state (e.g., is a card being dragged)

### React Context
Several context providers are used:
- **AuthContext**: For user authentication state (`src/lib/auth.tsx`)
- **ApiKeyContext**: For managing API keys (`src/lib/apiKeyContext.tsx`)
- **ThreadContext**: For current chat thread data

### Custom Hooks
The application uses custom hooks to encapsulate and reuse stateful logic:
- **useThreadSynths**: Manages synths in the current thread (`src/hooks/useCOAI.tsx`)
- **useSynths**: Manages user's custom synths (`src/hooks/useCOAI.tsx`)
- **useTeams**: Manages user's teams (`src/hooks/useCOAI.tsx`)
- **useTeamDynamics**: Manages team interactions (`src/hooks/useTeamDynamics.tsx`)

### Persistence Strategy
Different data is persisted in different ways:
- User authentication: Supabase session
- Application data: Supabase tables
- UI preferences: LocalStorage
- Temporary state: React state only

## Data Flow

The application follows a unidirectional data flow pattern:

### User Authentication Flow
1. User signs in via Supabase Auth
2. Auth state is stored in AuthContext
3. UI updates to show authenticated content
4. Subsequent API calls include authentication tokens

### Chat Flow
1. User selects or creates a thread
2. Thread data is loaded from Supabase
3. UI displays thread messages and participants
4. User sends a message through MessageInput
5. Message is processed and stored
6. AI response is streamed back to UI

### Synth Creation Flow
1. User opens CreateSynthModal
2. User fills in synth details
3. Form validates input
4. On submit, API call creates synth
5. UI updates to show new synth
6. Modal closes

### Team Interaction Flow
1. User selects team members
2. Team configuration is stored
3. Messages are routed to appropriate team members
4. Team dynamics affect AI responses
5. UI updates to reflect team interactions

## Supabase Integration

The application uses Supabase as its backend service, integrating with several Supabase features:

### Authentication
- **Google OAuth**: Implemented for user sign-in (see `GOOGLE_OAUTH_SETUP.md`)
- **Session Management**: Handled through the Supabase client
- **User Profiles**: Stored in the `profiles` table

### Database Structure
Following the project rules, the database schema uses a simplified table structure:
- Each table contains:
  - UUID primary key
  - created_at and updated_at timestamps
  - data JSONB column
  - Foreign key IDs as needed

### Key Tables
- **profiles**: User profile information
- **synths**: AI synth definitions
- **teams**: Collections of synths
- **threads**: Conversation threads (independent of teams)
- **messages**: Individual messages within threads

### Storage
- **Images**: Profile pictures for synths and users
- **Files**: Attachments shared in conversations
- Organized in buckets with proper access controls

### Edge Functions
The application uses Supabase Edge Functions for serverless operations:
- `chat`: Handles message processing
- `chat-stream`: Manages streaming responses
- `create-synth-ai`: Generates new AI synths
- `create-team-ai`: Creates AI teams
- `generate-synth-image`: Generates profile images for synths
- `upload-image`: Handles image uploads
- `upload-image-to-storage`: Stores uploaded images in Supabase Storage

## API Structure

The application's API structure is organized by functionality:

### API Utilities
- `src/lib/api-utils.ts`: Core API utilities
- `src/lib/supabase.ts`: Supabase client configuration

### API Endpoints
Edge functions are used to implement serverless API endpoints:

- **/chat**
  - Processes chat messages
  - Routes messages to appropriate AI models
  - Handles context management

- **/chat-stream**
  - Implements streaming responses
  - Manages token-by-token delivery for AI responses

- **/create-synth-ai**
  - Generates new AI synths
  - Creates personality profiles
  - Configures system prompts

- **/create-team-ai**
  - Generates teams of synths
  - Defines team dynamics and relationships
  - Creates balanced team compositions

- **/generate-synth-image**
  - Creates visual representations for synths
  - Ensures consistent style and quality

- **/upload-image** and **/upload-image-to-storage**
  - Handle image uploads
  - Process and optimize images
  - Store images with proper permissions

### API Client Implementation
API calls are implemented in various service modules:
- `src/lib/services/`: Service modules for API operations
- `src/lib/storage/SupabaseAdapter.ts`: Adapter for Supabase storage operations

## File Organization

The application's codebase is organized into a structured directory hierarchy:

### Core Directories
- `src/components/`: UI components organized by functionality
  - `ui/`: Base UI components (shadcn/ui)
  - `layout/`: Layout components
  - `chat/`: Chat interface components
  - `browser/`: Browser and navigation components
  - `profile/`: Profile display components
  - `settings/`: Settings and configuration components

- `src/hooks/`: Custom React hooks
  - `useCOAI.tsx`: Core hooks for COAI functionality
  - `useTeamDynamics.tsx`: Team interaction management

- `src/lib/`: Utility libraries and services
  - `services/`: Service modules
  - `storage/`: Storage adapters
  - `utils/`: Utility functions

- `src/types/`: TypeScript type definitions

- `src/data/`: Static data and initial state

### Public Assets
- `public/images/`: Static images
  - `portraits/`: Default portrait images
  - `teams/`: Team-related images and backgrounds

### Backend Code
- `supabase/functions/`: Edge function implementations
  - `_shared/`: Shared utilities for edge functions
  - Function-specific directories

- `supabase/migrations/`: Database migrations

### Configuration Files
- `components.json`: shadcn/ui configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `vite.config.ts`: Vite bundler configuration

---

This documentation provides a comprehensive overview of the COAI interface architecture. For more detailed information about specific components or implementation details, refer to the source code in the corresponding directories. 