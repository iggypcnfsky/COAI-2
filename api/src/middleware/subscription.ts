import type { Context, Next } from 'hono';
import { ACTIVE_SUB_STATUSES } from '../env.js';
import { getUserByClerkId } from '../lib/users.js';

export async function requireSubscription(c: Context, next: Next) {
  const authUser = c.get('authUser');
  const user = await getUserByClerkId(authUser.clerkId);
  if (!user || !ACTIVE_SUB_STATUSES.has(user.subscriptionStatus)) {
    return c.json({ error: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' }, 402);
  }
  await next();
}
