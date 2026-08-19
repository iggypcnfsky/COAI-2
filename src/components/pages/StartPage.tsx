import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { apiFetch } from '@/lib/api/client';
import { useAppStore } from '@/stores/appStore';
import { COAIProfile } from '@/types';
import { AuthPageFrame } from '@/components/auth/AuthControls';

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
      <div className="text-center space-y-4 max-w-md">
        <p className="text-sm uppercase tracking-[0.3em] text-[#c4a574]">COAI</p>
        {!isLoaded ? (
          <h1 className="font-serif text-3xl">Loading…</h1>
        ) : !isSignedIn ? (
          <>
            <h1 className="font-serif text-3xl">Sign in to open your studio</h1>
            <Link
              to="/sign-in"
              className="inline-flex items-center px-7 py-3 bg-[#c4a574] text-[#0b0b0c] font-medium tracking-wide hover:bg-[#d4b98a]"
            >
              Sign in
            </Link>
          </>
        ) : error ? (
          <>
            <h1 className="font-serif text-3xl">Couldn’t open your account</h1>
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-[#a8a29a] text-sm">Sign out from the top right and try again, or continue home.</p>
            <Link to="/" className="inline-flex text-sm uppercase tracking-widest text-[#c4a574]">
              Home
            </Link>
          </>
        ) : (
          <h1 className="font-serif text-3xl">Opening your studio</h1>
        )}
      </div>
    </AuthPageFrame>
  );
}
