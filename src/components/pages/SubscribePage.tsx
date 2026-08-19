import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { apiFetch } from '@/lib/api/client';
import { useAppStore } from '@/stores/appStore';
import { COAIProfile } from '@/types';
import { AuthPageFrame } from '@/components/auth/AuthControls';
import { Button } from '@/components/ui/button';

const ACTIVE = new Set(['trialing', 'active']);

export function SubscribePage() {
  const [params] = useSearchParams();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const setProfile = useAppStore((s) => s.setProfile);
  const setSubscription = useAppStore((s) => s.setSubscription);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function goAfterBilling(status: string, onboardedAt: string | null, hasByok: boolean) {
    setSubscription(status, onboardedAt, hasByok);
    if (ACTIVE.has(status)) {
      window.location.assign(onboardedAt ? '/app' : '/onboarding');
      return true;
    }
    return false;
  }

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Sign in first.');
        setBusy(false);
        return;
      }

      const sessionId = params.get('session_id');
      if (sessionId) {
        const confirmed = await apiFetch<{
          subscriptionStatus: string;
          onboardedAt: string | null;
          hasByok: boolean;
        }>('/billing/confirm', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        });
        if (await goAfterBilling(confirmed.subscriptionStatus, confirmed.onboardedAt, confirmed.hasByok)) {
          return;
        }
      }

      const me = await apiFetch<{
        user: { subscriptionStatus: string; onboardedAt: string | null; hasByok: boolean };
        profile: COAIProfile | null;
      }>('/me');
      if (me.profile) setProfile(me.profile);
      if (me.user) {
        if (await goAfterBilling(me.user.subscriptionStatus, me.user.onboardedAt, me.user.hasByok)) {
          return;
        }
      }

      if (params.get('checkout') === 'success') {
        setError('Payment received, but the trial is still syncing. Wait a moment and retry.');
        setBusy(false);
        return;
      }

      const res = await apiFetch<{ url: string }>('/billing/checkout', { method: 'POST' });
      if (res.url) window.location.assign(res.url);
      else setError('Checkout is not configured yet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after Clerk is ready
  }, [isLoaded, isSignedIn]);

  return (
    <AuthPageFrame>
      <div className="max-w-md text-center space-y-4 font-sans">
        <p className="text-sm uppercase tracking-[0.3em] text-[#c4a574]">Start trial</p>
        <h1 className="font-serif text-4xl">
          {!isLoaded ? 'Loading…' : isSignedIn ? 'Redirecting to checkout' : 'Sign in to start a trial'}
        </h1>
        <p className="text-[#a8a29a]">Card on file, 14 days free, then a monthly subscription for platform access.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {isLoaded && !isSignedIn && (
          <Link
            to="/sign-in"
            className="inline-flex items-center px-7 py-3 bg-[#c4a574] text-[#0b0b0c] font-medium tracking-wide hover:bg-[#d4b98a]"
          >
            Sign in
          </Link>
        )}
        {error && isSignedIn && (
          <Button
            onClick={() => void startCheckout()}
            disabled={busy}
            className="bg-[#c4a574] text-[#0b0b0c] hover:bg-[#d4b98a]"
          >
            {busy ? 'Retrying…' : 'Continue'}
          </Button>
        )}
      </div>
    </AuthPageFrame>
  );
}
