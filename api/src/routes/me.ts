import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { profiles, users } from '../db/schema.js';
import { encryptSecret } from '../lib/crypto.js';
import { getUserByClerkId, serializeRow } from '../lib/users.js';
import { syncUserSubscription } from '../lib/stripeBilling.js';

export const meRoutes = new Hono();

meRoutes.get('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const user = await syncUserSubscription(clerkId);
  const profileRows = await db.select().from(profiles).where(eq(profiles.userId, clerkId)).limit(1);
  return c.json({
    user: user
      ? {
          id: user.clerkId,
          clerkId: user.clerkId,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          trialEndsAt: user.trialEndsAt,
          onboardedAt: user.onboardedAt,
          hasByok: Boolean(user.openrouterKeyEncrypted),
        }
      : null,
    profile: profileRows[0] ? serializeRow(profileRows[0]) : null,
  });
});

meRoutes.put('/profile', async (c) => {
  const { clerkId, displayName, avatar } = c.get('authUser');
  const body = await c.req.json().catch(() => ({}));
  const existing = await db.select().from(profiles).where(eq(profiles.userId, clerkId)).limit(1);
  const current = (existing[0]?.profileData ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    ...body,
    displayName: body.displayName ?? current.displayName ?? displayName,
    avatar: body.avatar ?? current.avatar ?? avatar,
  };
  const [saved] = existing[0]
    ? await db.update(profiles).set({ profileData: next, updatedAt: new Date() }).where(eq(profiles.userId, clerkId)).returning()
    : await db.insert(profiles).values({ userId: clerkId, profileData: next }).returning();
  return c.json(serializeRow(saved));
});

meRoutes.post('/onboarding', async (c) => {
  const { clerkId, displayName } = c.get('authUser');
  const body = z.object({ displayName: z.string().min(1).max(80).optional() }).parse(await c.req.json().catch(() => ({})));
  const existing = await db.select().from(profiles).where(eq(profiles.userId, clerkId)).limit(1);
  const current = (existing[0]?.profileData ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    displayName: body.displayName ?? current.displayName ?? displayName ?? 'User',
  };
  if (existing[0]) {
    await db.update(profiles).set({ profileData: next, updatedAt: new Date() }).where(eq(profiles.userId, clerkId));
  } else {
    await db.insert(profiles).values({ userId: clerkId, profileData: next });
  }
  const [user] = await db
    .update(users)
    .set({ onboardedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId))
    .returning();
  return c.json({ ok: true, onboardedAt: user.onboardedAt });
});

meRoutes.put('/openrouter-key', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({ key: z.string().nullable() }).parse(await c.req.json());
  const encrypted = body.key && body.key.trim() ? encryptSecret(body.key.trim()) : null;
  await db.update(users).set({ openrouterKeyEncrypted: encrypted, updatedAt: new Date() }).where(eq(users.clerkId, clerkId));
  return c.json({ hasByok: Boolean(encrypted) });
});
