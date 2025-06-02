import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PostHogProvider } from 'posthog-js/react';
import { ApiKeyProvider } from './lib/apiKeyContext';
import { AuthProvider } from './lib/auth';

// PostHog configuration
const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
};

// Note: AuthProvider and ApiKeyProvider are maintained for backward compatibility
// They are now just wrappers around the Zustand store for gradual migration
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider 
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={options}
    >
      <AuthProvider>
        <ApiKeyProvider>
          <App />
        </ApiKeyProvider>
      </AuthProvider>
    </PostHogProvider>
  </StrictMode>
);
