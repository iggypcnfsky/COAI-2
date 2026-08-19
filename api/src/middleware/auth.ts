import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';
import { env } from '../env.js';
import { ensureUser } from '../lib/users.js';

export const clerkClient = createClerkClient({ secretKey: env.clerkSecretKey });

export type AppUser = {
  clerkId: string;
  email?: string | null;
  displayName?: string | null;
  avatar?: string | null;
};

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AppUser;
  }
}

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, { secretKey: env.clerkSecretKey });
    const clerkId = payload.sub;
    if (!clerkId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let email: string | null = null;
    let displayName: string | null = null;
    let avatar: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || null;
      avatar = clerkUser.imageUrl ?? null;
    } catch {
      // Token is valid even if the user fetch fails
    }

    try {
      await ensureUser({ clerkId, email, displayName, avatar });
    } catch (error) {
      console.error('Failed to load user record', error);
      return c.json({ error: 'Database unavailable' }, 503);
    }

    c.set('authUser', { clerkId, email, displayName, avatar });
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'token verification failed';
    console.error('Auth verification failed', message);
    return c.json({ error: 'Unauthorized' }, 401);
  }
}
