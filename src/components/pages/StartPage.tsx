import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { apiFetch } from '@/lib/api/client';
import { useAppStore } from '@/stores/appStore';
import { COAIProfile } from '@/types';
import { AuthPageFrame } from '@/components/auth/AuthControls';
import { Button } from '@/components/ui/button';

const ACTIVE = new Set(['trialing', 'active']);

export function StartPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const setProfile = useAppStore((s) => s.setProfile);
  const setSubscription = useAppStore((s) => s.setSubscription);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled || !token) return;
      try {
        const me = await apiFetch<{
          user: { subscriptionStatus: string; onboardedAt: string | null; hasByok: boolean };
          profile: COAIProfile | null;
        }>('/me');
        if (cancelled) return;
        if (me.profile) setProfile(me.profile);
        if (me.user) {
          setSubscription(me.user.subscriptionStatus, me.user.onboardedAt, me.user.hasByok);
          if (!ACTIVE.has(me.user.subscriptionStatus)) {
            navigate('/subscribe', { replace: true });
            return;
          }
          if (!me.user.onboardedAt) {
            navigate('/onboarding', { replace: true });
            return;
          }
          navigate('/app', { replace: true });
          return;
        }
        navigate('/subscribe', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load account');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, navigate, setProfile, setSubscription]);

  return (
    <AuthPageFrame>
      <div className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">COAI</p>
        {!isLoaded ? (
          <h1 className="text-2xl font-semibold tracking-tight">Loading…</h1>
        ) : !isSignedIn ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to open your studio</h1>
            <Button asChild>
              <Link to="/sign-in">Sign in</Link>
            </Button>
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Couldn’t open your account</h1>
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-sm text-neutral-500">Sign out from the account menu and try again, or continue home.</p>
            <Button variant="outline" asChild>
              <Link to="/">Home</Link>
            </Button>
          </>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">Opening your studio</h1>
        )}
      </div>
    </AuthPageFrame>
  );
}
