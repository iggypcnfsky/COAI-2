import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { getUserByClerkId } from './users.js';
import { stripe } from './stripe.js';

const STALE_STATUSES = new Set(['none', 'incomplete', 'incomplete_expired']);
const ACTIVE_STATUSES = new Set(['trialing', 'active']);

export async function applySubscription(sub: Stripe.Subscription) {
  const clerkId = sub.metadata?.clerk_id;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  const patch = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    trialEndsAt,
    updatedAt: new Date(),
  };
  if (clerkId) {
    await db.update(users).set(patch).where(eq(users.clerkId, clerkId));
    return;
  }
  await db.update(users).set(patch).where(eq(users.stripeCustomerId, customerId));
}

export async function applyCheckoutSession(session: Stripe.Checkout.Session, clerkId: string) {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (customerId || subscriptionId) {
    await db.update(users).set({
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId, subscriptionStatus: 'trialing' } : {}),
      updatedAt: new Date(),
    }).where(eq(users.clerkId, clerkId));
  }

  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await applySubscription(sub);
  }
}

export async function syncUserSubscription(clerkId: string) {
  const user = await getUserByClerkId(clerkId);
  if (!user) return null;
  if (ACTIVE_STATUSES.has(user.subscriptionStatus)) return user;
  if (!user.stripeCustomerId || !STALE_STATUSES.has(user.subscriptionStatus)) return user;

  const list = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'all',
    limit: 10,
  });
  const sub =
    list.data.find((item) => ACTIVE_STATUSES.has(item.status)) ||
    list.data[0];
  if (!sub) return user;
  if (!sub.metadata?.clerk_id) {
    await stripe.subscriptions.update(sub.id, { metadata: { clerk_id: clerkId } });
    sub.metadata = { ...sub.metadata, clerk_id: clerkId };
  }
  await applySubscription(sub);
  return getUserByClerkId(clerkId);
}
