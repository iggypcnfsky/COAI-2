import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useAppStore } from '@/stores/appStore';

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const subscriptionStatus = useAppStore((s) => s.subscriptionStatus);
  const onboardedAt = useAppStore((s) => s.onboardedAt);

  if (!isLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-sm text-neutral-500">
        Loading…
      </div>
    );
  }
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }
  if (!['trialing', 'active'].includes(subscriptionStatus)) {
    return <Navigate to={subscriptionStatus === 'none' ? '/subscribe' : '/paywall'} replace />;
  }
  if (!onboardedAt) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}
