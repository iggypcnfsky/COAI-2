import { Hono } from 'hono';
import { and, desc, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { synths } from '../db/schema.js';
import { serializeRow } from '../lib/users.js';

export const synthRoutes = new Hono();

synthRoutes.get('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const rows = await db
    .select()
    .from(synths)
    .where(or(eq(synths.isPublic, true), eq(synths.userId, clerkId)))
    .orderBy(desc(synths.createdAt));
  return c.json(rows.map(serializeRow));
});

synthRoutes.get('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const rows = await db.select().from(synths).where(eq(synths.id, id)).limit(1);
  const row = rows[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (!row.isPublic && row.userId !== clerkId) return c.json({ error: 'Not found' }, 404);
  return c.json(serializeRow(row));
});

synthRoutes.post('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({ synth_data: z.record(z.unknown()) }).parse(await c.req.json());
  const isPublic = body.synth_data.isPublic !== false;
  const [row] = await db.insert(synths).values({
    userId: clerkId,
    synthData: { ...body.synth_data, isPublic },
    isPublic,
  }).returning();
  return c.json(serializeRow(row), 201);
});

synthRoutes.patch('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const body = z.object({ synth_data: z.record(z.unknown()) }).parse(await c.req.json());
  const existing = await db.select().from(synths).where(and(eq(synths.id, id), eq(synths.userId, clerkId))).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const merged = { ...existing[0].synthData, ...body.synth_data };
  const isPublic = merged.isPublic !== false;
  const [row] = await db.update(synths).set({
    synthData: merged,
    isPublic,
    updatedAt: new Date(),
  }).where(eq(synths.id, id)).returning();
  return c.json(serializeRow(row));
});

synthRoutes.delete('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const deleted = await db.delete(synths).where(and(eq(synths.id, id), eq(synths.userId, clerkId))).returning();
  if (!deleted[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});
