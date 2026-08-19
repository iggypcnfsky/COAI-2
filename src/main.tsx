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
          colorPrimary: '#2563eb',
          colorBackground: '#ffffff',
          colorForeground: '#171717',
          colorMutedForeground: '#737373',
          colorNeutral: '#737373',
          colorInput: '#ffffff',
          colorInputForeground: '#171717',
          colorBorder: '#e5e5e5',
          borderRadius: '0.5rem',
          fontFamily: '"Google Sans Flex", ui-sans-serif, system-ui, sans-serif',
          fontFamilyButtons: '"Google Sans Flex", ui-sans-serif, system-ui, sans-serif',
        },
        elements: {
          card: {
            boxShadow: 'none',
            border: '1px solid #e5e5e5',
          },
          formButtonPrimary: {
            boxShadow: 'none',
          },
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
