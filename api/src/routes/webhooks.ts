import { Hono } from 'hono';
import { Webhook } from 'svix';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { ensureUser } from '../lib/users.js';
import { stripe } from '../lib/stripe.js';
import { applyCheckoutSession, applySubscription } from '../lib/stripeBilling.js';

export const webhookRoutes = new Hono();

webhookRoutes.post('/clerk', async (c) => {
  if (!env.clerkWebhookSecret) {
    return c.json({ error: 'Webhook not configured' }, 500);
  }
  const payload = await c.req.text();
  const svixId = c.req.header('svix-id');
  const svixTimestamp = c.req.header('svix-timestamp');
  const svixSignature = c.req.header('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing signature headers' }, 400);
  }
  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(env.clerkWebhookSecret);
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const data = event.data as {
      id: string;
      email_addresses?: Array<{ email_address?: string }>;
      first_name?: string;
      last_name?: string;
      image_url?: string;
    };
    await ensureUser({
      clerkId: data.id,
      email: data.email_addresses?.[0]?.email_address ?? null,
      displayName: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
      avatar: data.image_url ?? null,
    });
  }

  if (event.type === 'user.deleted') {
    const data = event.data as { id: string };
    await db.delete(users).where(eq(users.clerkId, data.id));
  }

  return c.json({ ok: true });
});

webhookRoutes.post('/stripe', async (c) => {
  if (!env.stripeWebhookSecret) {
    return c.json({ error: 'Webhook not configured' }, 500);
  }
  const payload = await c.req.text();
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing signature' }, 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = (session.client_reference_id || session.metadata?.clerk_id) ?? null;
        if (clerkId) {
          await applyCheckoutSession(session, clerkId);
        } else if (typeof session.subscription === 'string' || session.subscription?.id) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await applySubscription(sub);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          parent?: { subscription_details?: { subscription?: string | null } } | null;
        };
        const subId =
          (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id) ||
          invoice.parent?.subscription_details?.subscription ||
          null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('Stripe webhook handler failed', error);
    return c.json({ error: 'Webhook handler failed' }, 500);
  }

  return c.json({ received: true });
});
