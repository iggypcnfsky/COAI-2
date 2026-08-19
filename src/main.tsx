import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.tsx';
import './index.css';
import { ApiKeyProvider } from './lib/apiKeyContext';
import { AuthProvider } from './lib/auth';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/start"
      signUpFallbackRedirectUrl="/start"
      appearance={{
        variables: {
          colorBackground: '#0b0b0c',
          colorPrimary: '#c4a574',
          borderRadius: '0.25rem',
        },
      }}
    >
      <AuthProvider>
        <ApiKeyProvider>
          <App />
        </ApiKeyProvider>
      </AuthProvider>
    </ClerkProvider>
  </StrictMode>
);
