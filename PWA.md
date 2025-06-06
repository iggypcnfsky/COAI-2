# COAI Progressive Web App (PWA) Implementation Plan

This document outlines a comprehensive plan to convert the COAI application into a Progressive Web App (PWA), taking into consideration the existing architecture and providing a staged implementation approach.

## Current Architecture Analysis

Based on the existing COAI architecture:

- **Framework**: React 18 + Vite + TypeScript
- **State Management**: Zustand-based centralized state
- **Backend**: Supabase with edge functions
- **Authentication**: Optional authentication with API key support
- **Data Model**: Normalized entities (synths, teams, threads, messages)
- **Real-time**: Supabase real-time subscriptions
- **Analytics**: PostHog integration

## PWA Implementation Strategy

### Stage 1: Minimal PWA (Quick Wins) - 1-2 Days

**Goal**: Enable basic PWA functionality with minimal code changes

#### 1.1 Web App Manifest
- **Effort**: Low
- **Impact**: High (enables "Add to Home Screen")

```json
// public/manifest.json
{
  "name": "COAI - AI Team Collaboration Platform",
  "short_name": "COAI",
  "description": "Collaborate with AI synths in teams and conversations",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "categories": ["productivity", "business", "collaboration"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Chat",
      "short_name": "Chat",
      "description": "Start a new conversation",
      "url": "/?action=new-chat",
      "icons": [{ "src": "/icons/chat-192x192.png", "sizes": "192x192" }]
    },
    {
      "name": "Create Synth",
      "short_name": "Synth",
      "description": "Create a new AI synth",
      "url": "/?action=create-synth",
      "icons": [{ "src": "/icons/synth-192x192.png", "sizes": "192x192" }]
    }
  ]
}
```

#### 1.2 Basic Service Worker
- **Effort**: Low
- **Impact**: Medium (enables offline page, basic caching)

```typescript
// public/sw.js - Basic service worker
const CACHE_NAME = 'coai-v1';
const OFFLINE_URL = '/offline.html';

// Cache essential resources
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
  }
});
```

#### 1.3 Vite PWA Plugin Integration
- **Effort**: Low
- **Impact**: High (automated PWA setup)

```typescript
// vite.config.ts updates
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      manifest: {
        // Will be auto-generated from public/manifest.json
      }
    })
  ]
});
```

#### 1.4 HTML Meta Tags Update
- **Effort**: Minimal
- **Impact**: Medium (better mobile experience)

```html
<!-- index.html additions -->
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="COAI">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
<link rel="manifest" href="/manifest.json">
```

**Stage 1 Deliverables**:
- ✅ Installable PWA
- ✅ Basic offline page
- ✅ App icons and branding
- ✅ Mobile-optimized display

---

### Stage 2: Enhanced Offline Support - 3-5 Days

**Goal**: Leverage existing Zustand architecture for intelligent offline functionality

#### 2.1 Zustand Persistence Enhancement
- **Effort**: Medium
- **Impact**: High (seamless offline/online transitions)

```typescript
// src/stores/pwaStore.ts
interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  offlineQueue: QueuedAction[];
  lastSync: Date | null;
}

interface QueuedAction {
  id: string;
  type: 'CREATE_MESSAGE' | 'UPDATE_SYNTH' | 'CREATE_THREAD';
  payload: any;
  timestamp: Date;
  retryCount: number;
}

const usePWAStore = create<PWAState>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      isInstalled: false,
      updateAvailable: false,
      offlineQueue: [],
      lastSync: null,
      
      // Actions
      addToOfflineQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
        set(state => ({
          offlineQueue: [...state.offlineQueue, {
            ...action,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            retryCount: 0
          }]
        }));
      },
      
      processOfflineQueue: async () => {
        const { offlineQueue } = get();
        // Process queued actions when back online
        // Integrate with existing directService
      }
    }),
    {
      name: 'coai-pwa-storage',
      partialize: (state) => ({
        offlineQueue: state.offlineQueue,
        lastSync: state.lastSync
      })
    }
  )
);
```

#### 2.2 Enhanced Service Worker with Zustand Integration
- **Effort**: Medium
- **Impact**: High (intelligent caching based on app state)

```typescript
// src/lib/services/pwaService.ts
class PWAService {
  private store: any;
  
  constructor(store: any) {
    this.store = store;
  }
  
  async cacheEssentialData() {
    const state = this.store.getState();
    
    // Cache current user's synths
    if (state.entities.synths) {
      await this.cacheUserSynths(Object.values(state.entities.synths));
    }
    
    // Cache recent threads and messages
    if (state.entities.threads) {
      await this.cacheRecentThreads(Object.values(state.entities.threads));
    }
  }
  
  async handleOfflineMessage(message: any) {
    // Add to Zustand offline queue
    this.store.getState().addToOfflineQueue({
      type: 'CREATE_MESSAGE',
      payload: message
    });
    
    // Optimistically update UI
    this.store.getState().addMessage(message);
  }
}
```

#### 2.3 Network Status Integration
- **Effort**: Low
- **Impact**: Medium (better UX feedback)

```typescript
// src/hooks/useNetworkStatus.ts
export const useNetworkStatus = () => {
  const { isOnline, setOnlineStatus } = usePWAStore();
  
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      // Process offline queue
      usePWAStore.getState().processOfflineQueue();
    };
    
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline };
};
```

**Stage 2 Deliverables**:
- ✅ Offline message queuing
- ✅ Intelligent data caching
- ✅ Network status awareness
- ✅ Optimistic UI updates

---

### Stage 3: Advanced PWA Features - 5-7 Days

**Goal**: Full PWA experience with push notifications and background sync

#### 3.1 Push Notifications Integration
- **Effort**: High
- **Impact**: High (re-engagement, real-time alerts)

```typescript
// src/lib/services/notificationService.ts
class NotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  async subscribeToNotifications() {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY
      )
    });
    
    // Send subscription to Supabase edge function
    await this.sendSubscriptionToServer(subscription);
  }
  
  // Integrate with existing Supabase real-time subscriptions
  setupRealtimeNotifications() {
    const supabase = createClient(/* ... */);
    
    supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'coai-messages',
        filter: `thread_id=in.(${userThreadIds.join(',')})`
      }, (payload) => {
        if (document.hidden) {
          this.showNotification(payload.new);
        }
      })
      .subscribe();
  }
}
```

#### 3.2 Background Sync for Offline Actions
- **Effort**: High
- **Impact**: High (reliable message delivery)

```typescript
// Service Worker background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'coai-offline-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  const store = await getStoredState();
  const { offlineQueue } = store;
  
  for (const action of offlineQueue) {
    try {
      await processQueuedAction(action);
      await removeFromQueue(action.id);
    } catch (error) {
      await incrementRetryCount(action.id);
    }
  }
}
```

#### 3.3 Install Prompt Component
- **Effort**: Medium
- **Impact**: Medium (increased installation rate)

```typescript
// src/components/PWAInstallPrompt.tsx
export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      usePWAStore.getState().setInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-card border rounded-lg p-4 shadow-lg">
      <h3 className="font-semibold">Install COAI</h3>
      <p className="text-sm text-muted-foreground">
        Get the full experience with offline access and notifications
      </p>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleInstall} size="sm">Install</Button>
        <Button variant="outline" onClick={() => setShowPrompt(false)} size="sm">
          Later
        </Button>
      </div>
    </div>
  );
};
```

**Stage 3 Deliverables**:
- ✅ Push notifications for new messages
- ✅ Background sync for offline actions
- ✅ Custom install prompt
- ✅ App shortcuts functionality

---

### Stage 4: Performance & UX Optimization - 3-4 Days

**Goal**: Optimize PWA performance and user experience

#### 4.1 Advanced Caching Strategies
- **Effort**: Medium
- **Impact**: High (faster load times, better offline experience)

```typescript
// Advanced Workbox configuration
const workboxConfig = {
  runtimeCaching: [
    // Supabase API calls
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    },
    
    // Synth images and avatars
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    
    // AI API responses (for unauthenticated users)
    {
      urlPattern: /^https:\/\/api\.openai\.com\/.*/,
      handler: 'NetworkOnly', // Never cache AI responses
      options: {
        cacheName: 'ai-api-cache'
      }
    }
  ]
};
```

#### 4.2 Optimistic UI Updates Enhancement
- **Effort**: Medium
- **Impact**: High (perceived performance improvement)

```typescript
// Enhanced message sending with optimistic updates
const useOptimisticMessages = () => {
  const { isOnline } = useNetworkStatus();
  
  const sendMessage = async (content: string, threadId: string) => {
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content,
      thread_id: threadId,
      sender_type: 'user',
      created_at: new Date().toISOString(),
      isPending: true
    };
    
    // Immediately add to UI
    addMessage(optimisticMessage);
    
    try {
      if (isOnline) {
        const realMessage = await directService.sendMessage(content, threadId);
        // Replace optimistic message with real one
        replaceMessage(optimisticMessage.id, realMessage);
      } else {
        // Add to offline queue
        addToOfflineQueue({
          type: 'CREATE_MESSAGE',
          payload: { content, threadId }
        });
      }
    } catch (error) {
      // Mark message as failed
      markMessageFailed(optimisticMessage.id);
    }
  };
};
```

#### 4.3 Update Management
- **Effort**: Medium
- **Impact**: Medium (seamless app updates)

```typescript
// src/components/PWAUpdatePrompt.tsx
export const PWAUpdatePrompt = () => {
  const { updateAvailable, setUpdateAvailable } = usePWAStore();
  
  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };
  
  if (!updateAvailable) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-primary text-primary-foreground rounded-lg p-4 shadow-lg">
      <p className="text-sm">New version available!</p>
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="secondary" onClick={handleUpdate}>
          Update Now
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setUpdateAvailable(false)}>
          Later
        </Button>
      </div>
    </div>
  );
};
```

**Stage 4 Deliverables**:
- ✅ Advanced caching strategies
- ✅ Enhanced optimistic updates
- ✅ Seamless update management
- ✅ Performance monitoring

---

### Stage 5: Authentication-Optional PWA Features - 2-3 Days

**Goal**: Optimize PWA for both authenticated and unauthenticated users

#### 5.1 API Key Management for PWA
- **Effort**: Medium
- **Impact**: High (enables full PWA for unauthenticated users)

```typescript
// Enhanced API key handling for PWA
const useAPIKeyPWA = () => {
  const { tempApiKeys } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  
  const validateAndCacheKeys = async (keys: Record<string, string>) => {
    if (!isOnline) {
      // Store keys for offline use
      setTempApiKeys(keys);
      return true;
    }
    
    // Validate keys online
    const validation = await validateApiKeys(keys);
    if (validation.valid) {
      setTempApiKeys(keys);
      // Cache validation result
      await cacheApiKeyValidation(keys, validation);
    }
    
    return validation.valid;
  };
  
  return { validateAndCacheKeys, tempApiKeys };
};
```

#### 5.2 Offline Data Migration
- **Effort**: High
- **Impact**: High (seamless auth transition)

```typescript
// Migration service for unauthenticated to authenticated users
class OfflineDataMigrationService {
  async migrateToAuthenticated(userId: string) {
    const offlineData = await this.getOfflineData();
    
    // Migrate synths
    for (const synth of offlineData.synths) {
      await supabase.from('coai-synths').insert({
        ...synth,
        created_by: userId
      });
    }
    
    // Migrate threads and messages
    for (const thread of offlineData.threads) {
      const { data: newThread } = await supabase
        .from('coai-threads')
        .insert({
          ...thread,
          created_by: userId
        })
        .select()
        .single();
      
      // Migrate associated messages
      const messages = offlineData.messages.filter(m => m.thread_id === thread.id);
      for (const message of messages) {
        await supabase.from('coai-messages').insert({
          ...message,
          thread_id: newThread.id
        });
      }
    }
    
    // Clear offline data after successful migration
    await this.clearOfflineData();
  }
}
```

---

## Implementation Timeline

### Quick Start (Stage 1): 1-2 Days
- Basic PWA manifest and service worker
- Installable app with offline page
- Mobile-optimized experience

### Enhanced Offline (Stage 2): 3-5 Days
- Zustand-integrated offline support
- Message queuing and optimistic updates
- Network status awareness

### Full PWA (Stage 3): 5-7 Days
- Push notifications
- Background sync
- Install prompts and shortcuts

### Optimization (Stage 4): 3-4 Days
- Advanced caching strategies
- Performance improvements
- Update management

### Auth-Optional PWA (Stage 5): 2-3 Days
- API key PWA support
- Offline data migration
- Seamless auth transitions

**Total Timeline**: 14-21 days for complete PWA implementation

## Architecture Integration Points

### Zustand Store Integration
The PWA features will integrate seamlessly with the existing Zustand architecture:

```typescript
// Enhanced store structure
interface AppState {
  // Existing state
  entities: NormalizedEntities;
  ui: UIState;
  auth: AuthState;
  
  // New PWA state
  pwa: PWAState;
  offline: OfflineState;
  notifications: NotificationState;
}
```

### Service Layer Enhancement
The existing `directService` will be enhanced to support PWA features:

```typescript
class DirectService {
  // Existing methods...
  
  // New PWA-aware methods
  async sendMessagePWA(content: string, threadId: string) {
    if (this.isOnline()) {
      return this.sendMessage(content, threadId);
    } else {
      return this.queueOfflineMessage(content, threadId);
    }
  }
  
  async syncOfflineData() {
    const queue = this.getOfflineQueue();
    for (const action of queue) {
      await this.processQueuedAction(action);
    }
  }
}
```

### Supabase Integration
PWA features will work with existing Supabase setup:

- **Real-time subscriptions** → Push notifications
- **Edge functions** → Background processing
- **Storage** → Cached assets
- **Auth** → Notification subscriptions

## Testing Strategy

### PWA Compliance Testing
- Lighthouse PWA audit (target: 100% score)
- Web App Manifest validation
- Service Worker functionality testing

### Cross-Platform Testing
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Android Chrome
- **Installation**: Test install flow on all platforms

### Offline Testing
- Network throttling simulation
- Offline message queuing
- Data synchronization testing

### Performance Testing
- Cache effectiveness measurement
- Load time optimization
- Background sync performance

## Success Metrics

### Technical Metrics
- Lighthouse PWA score: 100%
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cache hit rate: > 80%

### User Experience Metrics
- Install conversion rate: > 15%
- Offline usage sessions: Track and optimize
- Push notification engagement: > 30%
- Update adoption rate: > 90%

### Business Metrics
- User retention improvement
- Session duration increase
- Feature usage in offline mode
- Conversion from unauthenticated to authenticated users

This staged approach allows for incremental PWA implementation while maintaining the existing architecture and providing immediate value at each stage. 