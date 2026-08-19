import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles, users } from '../db/schema.js';

export async function ensureUser(input: {
  clerkId: string;
  email?: string | null;
  displayName?: string | null;
  avatar?: string | null;
}) {
  const existing = await db.select().from(users).where(eq(users.clerkId, input.clerkId)).limit(1);
  if (existing[0]) {
    if (input.email && existing[0].email !== input.email) {
      const [updated] = await db
        .update(users)
        .set({ email: input.email, updatedAt: new Date() })
        .where(eq(users.clerkId, input.clerkId))
        .returning();
      return updated;
    }
    return existing[0];
  }

  const [created] = await db
    .insert(users)
    .values({
      clerkId: input.clerkId,
      email: input.email ?? null,
      subscriptionStatus: 'none',
    })
    .returning();

  await db.insert(profiles).values({
    userId: input.clerkId,
    profileData: {
      displayName: input.displayName || input.email?.split('@')[0] || 'User',
      avatar: input.avatar || undefined,
      preferences: {
        theme: 'auto',
        notifications: true,
        defaultModel: 'claude-3-5-sonnet',
      },
    },
  }).onConflictDoNothing();

  return created;
}

export async function getUserByClerkId(clerkId: string) {
  const rows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

export function serializeRow<T extends Record<string, unknown>>(row: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    out[snake] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}
