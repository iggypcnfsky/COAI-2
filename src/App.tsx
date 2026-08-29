import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { initializeAppData } from '@/lib/services';
import { ClerkSync } from '@/components/auth/ClerkSync';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DesignPage } from '@/components/pages/DesignPage';
import { LandingPage } from '@/components/pages/LandingPage';
import { SignInPage } from '@/components/pages/SignInPage';
import { SignUpPage } from '@/components/pages/SignUpPage';
import { SubscribePage } from '@/components/pages/SubscribePage';
import { OnboardingPage } from '@/components/pages/OnboardingPage';
import { PaywallPage } from '@/components/pages/PaywallPage';
import { StartPage } from '@/components/pages/StartPage';

function AppShell() {
  useEffect(() => {
    initializeAppData().catch((error) => {
      console.error('Failed to initialize app data:', error);
    });
  }, []);

  return (
    <>
      <Layout initialMessages={[]} />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkSync />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/design" element={<Navigate to="/design/foundations/logo" replace />} />
        <Route path="/design/:section/:storyId" element={<DesignPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/paywall" element={<PaywallPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
