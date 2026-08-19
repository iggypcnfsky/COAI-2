import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Onboarding</p>
          <h1 className="text-2xl font-semibold tracking-tight">What should we call you?</h1>
          <p className="text-sm text-neutral-500">You can skip this and change it later in your profile.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? 'Saving…' : 'Enter the studio'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => finish()}>
            Skip
          </Button>
        </div>
      </form>
    </AuthPageFrame>
  );
}
