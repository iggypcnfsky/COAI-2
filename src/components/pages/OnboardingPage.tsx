import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/stores/appStore';
import { AuthPageFrame } from '@/components/auth/AuthControls';
import { COAIProfile } from '@/types';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const setSubscription = useAppStore((s) => s.setSubscription);
  const setProfile = useAppStore((s) => s.setProfile);
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate('/sign-in', { replace: true });
      return;
    }

    const sessionId = params.get('session_id');
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled || !token) return;
      try {
        if (sessionId) {
          const confirmed = await apiFetch<{
            subscriptionStatus: string;
            onboardedAt: string | null;
            hasByok: boolean;
          }>('/billing/confirm', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
          });
          if (cancelled) return;
          setSubscription(confirmed.subscriptionStatus, confirmed.onboardedAt, confirmed.hasByok);
          if (confirmed.onboardedAt) {
            navigate('/app', { replace: true });
            return;
          }
        }
        const me = await apiFetch<{
          user: { subscriptionStatus: string; onboardedAt: string | null; hasByok: boolean };
          profile: COAIProfile | null;
        }>('/me');
        if (cancelled) return;
        if (me.profile) setProfile(me.profile);
        if (me.user) setSubscription(me.user.subscriptionStatus, me.user.onboardedAt, me.user.hasByok);
        if (me.user?.onboardedAt) navigate('/app', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not confirm checkout');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, navigate, params, setProfile, setSubscription]);

  async function finish(name?: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ onboardedAt: string }>('/me/onboarding', {
        method: 'POST',
        body: JSON.stringify({ displayName: name?.trim() || undefined }),
      });
      const me = await apiFetch<{
        user: { subscriptionStatus: string; onboardedAt: string | null; hasByok: boolean };
      }>('/me');
      setSubscription(
        me.user?.subscriptionStatus || 'trialing',
        result.onboardedAt,
        me.user?.hasByok,
      );
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish onboarding');
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await finish(displayName);
  }

  return (
    <AuthPageFrame>
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 font-sans">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-[#c4a574]">Onboarding</p>
          <h1 className="font-serif text-4xl">What should we call you?</h1>
          <p className="text-[#a8a29a]">You can skip this and change it later in your profile.</p>
        </div>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="bg-transparent border-[#2a2a2c] h-12"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={busy} className="flex-1 bg-[#c4a574] text-[#0b0b0c] hover:bg-[#d4b98a]">
            {busy ? 'Saving…' : 'Enter COAI'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => finish()}>
            Skip
          </Button>
        </div>
      </form>
    </AuthPageFrame>
  );
}
