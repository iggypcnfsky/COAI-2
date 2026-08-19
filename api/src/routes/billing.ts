import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '../env.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { getUserByClerkId } from '../lib/users.js';
import { stripe } from '../lib/stripe.js';
import { applyCheckoutSession } from '../lib/stripeBilling.js';

export const billingRoutes = new Hono();

billingRoutes.post('/checkout', async (c) => {
  const { clerkId, email } = c.get('authUser');
  const user = await getUserByClerkId(clerkId);
  if (!user) return c.json({ error: 'User not found' }, 404);

  let customerId = user.stripeCustomerId;
  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if (existing.deleted) customerId = null;
    } catch {
      customerId = null;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { clerk_id: clerkId },
    });
    customerId = customer.id;
    await db.update(users).set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    }).where(eq(users.clerkId, clerkId));
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: clerkId,
    success_url: `${env.appUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/subscribe`,
    line_items: [{ price: env.stripePriceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: env.stripeTrialDays,
      metadata: { clerk_id: clerkId },
    },
    metadata: { clerk_id: clerkId },
  });

  return c.json({ url: session.url });
});

billingRoutes.post('/confirm', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({ sessionId: z.string().min(1) }).parse(await c.req.json());
  if (!body.sessionId.startsWith('cs_')) {
    return c.json({ error: 'Invalid checkout session' }, 400);
  }

  const session = await stripe.checkout.sessions.retrieve(body.sessionId);
  const sessionClerk = session.client_reference_id || session.metadata?.clerk_id;
  if (sessionClerk && sessionClerk !== clerkId) {
    return c.json({ error: 'Checkout session mismatch' }, 403);
  }
  if (session.status !== 'complete') {
    return c.json({ error: 'Checkout not complete' }, 400);
  }

  await applyCheckoutSession(session, clerkId);
  const user = await getUserByClerkId(clerkId);
  return c.json({
    subscriptionStatus: user?.subscriptionStatus ?? 'none',
    onboardedAt: user?.onboardedAt ?? null,
    hasByok: Boolean(user?.openrouterKeyEncrypted),
  });
});

billingRoutes.post('/portal', async (c) => {
  const { clerkId } = c.get('authUser');
  const user = await getUserByClerkId(clerkId);
  if (!user?.stripeCustomerId) {
    return c.json({ error: 'No billing account' }, 400);
  }
  try {
    await stripe.customers.retrieve(user.stripeCustomerId);
  } catch {
    return c.json({ error: 'No billing account for the current Stripe mode' }, 400);
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${env.appUrl}/app`,
  });
  return c.json({ url: session.url });
});
