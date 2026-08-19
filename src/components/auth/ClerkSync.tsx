import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { setAuthTokenGetter } from '@/lib/api/client';
import { apiFetch } from '@/lib/api/client';
import { useAppStore } from '@/stores/appStore';
import { COAIProfile } from '@/types';

export function ClerkSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const setSession = useAppStore((s) => s.setSession);
  const setUser = useAppStore((s) => s.setUser);
  const setProfile = useAppStore((s) => s.setProfile);
  const setSubscription = useAppStore((s) => s.setSubscription);

  useEffect(() => {
    setAuthTokenGetter(async () => (await getToken()) ?? null);
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setSubscription('none', null, false);
      return;
    }

    const appUser = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      user_metadata: {
        full_name: user.fullName,
        name: user.fullName,
        avatar_url: user.imageUrl,
        picture: user.imageUrl,
      },
    };
    setUser(appUser);
    setSession({ user: appUser });

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
        }
      } catch (error) {
        console.error('Failed to load account', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, getToken, setProfile, setSession, setSubscription, setUser]);

  return null;
}
