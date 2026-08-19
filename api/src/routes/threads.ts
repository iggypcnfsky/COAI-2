import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { threadSynths, threads } from '../db/schema.js';
import { serializeRow } from '../lib/users.js';

export const threadRoutes = new Hono();

function toThread(row: typeof threads.$inferSelect) {
  const data = row.threadData as { title?: string; isActive?: boolean };
  return {
    id: row.id,
    title: data.title || 'Untitled Thread',
    isActive: data.isActive !== false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user_id: row.userId,
    team_id: row.teamId,
    thread_data: row.threadData,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

threadRoutes.get('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const teamId = c.req.query('teamId');
  const rows = teamId
    ? await db.select().from(threads).where(and(eq(threads.userId, clerkId), eq(threads.teamId, teamId))).orderBy(desc(threads.updatedAt))
    : await db.select().from(threads).where(eq(threads.userId, clerkId)).orderBy(desc(threads.updatedAt));
  return c.json(rows.map(toThread));
});

threadRoutes.get('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const rows = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).limit(1);
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  return c.json(toThread(rows[0]));
});

threadRoutes.post('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({
    title: z.string().optional(),
    team_id: z.string().uuid().nullable().optional(),
    thread_data: z.record(z.unknown()).optional(),
  }).parse(await c.req.json().catch(() => ({})));
  const threadData = {
    title: body.title || (body.thread_data?.title as string) || 'Untitled Thread',
    isActive: true,
    ...(body.thread_data ?? {}),
  };
  const [row] = await db.insert(threads).values({
    userId: clerkId,
    teamId: body.team_id ?? null,
    threadData,
  }).returning();
  return c.json(toThread(row), 201);
});

threadRoutes.patch('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const body = z.object({
    title: z.string().optional(),
    isActive: z.boolean().optional(),
    thread_data: z.record(z.unknown()).optional(),
  }).parse(await c.req.json());
  const existing = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const merged = {
    ...existing[0].threadData,
    ...(body.thread_data ?? {}),
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
  };
  const [row] = await db.update(threads).set({
    threadData: merged,
    updatedAt: new Date(),
  }).where(eq(threads.id, id)).returning();
  return c.json(toThread(row));
});

threadRoutes.delete('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const deleted = await db.delete(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).returning();
  if (!deleted[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

threadRoutes.get('/:id/synths', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const thread = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).limit(1);
  if (!thread[0]) return c.json({ error: 'Not found' }, 404);
  const rows = await db.select().from(threadSynths).where(eq(threadSynths.threadId, id));
  return c.json(rows.map(serializeRow));
});

threadRoutes.post('/:id/synths', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const thread = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).limit(1);
  if (!thread[0]) return c.json({ error: 'Not found' }, 404);
  const body = z.object({
    synth_id: z.string().uuid().nullable().optional(),
    synth_reference: z.record(z.unknown()),
  }).parse(await c.req.json());
  const [row] = await db.insert(threadSynths).values({
    threadId: id,
    synthId: body.synth_id ?? (typeof body.synth_reference.synthId === 'string' ? body.synth_reference.synthId : null),
    synthReference: body.synth_reference,
  }).returning();
  return c.json(serializeRow(row), 201);
});

threadRoutes.delete('/:id/synths/:synthId', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const synthId = c.req.param('synthId');
  const thread = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).limit(1);
  if (!thread[0]) return c.json({ error: 'Not found' }, 404);
  await db.delete(threadSynths).where(and(eq(threadSynths.threadId, id), eq(threadSynths.synthId, synthId)));
  return c.json({ ok: true });
});

threadRoutes.patch('/:id/synths/:synthId', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const synthId = c.req.param('synthId');
  const thread = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.userId, clerkId))).limit(1);
  if (!thread[0]) return c.json({ error: 'Not found' }, 404);
  const body = z.object({ synth_reference: z.record(z.unknown()) }).parse(await c.req.json());
  const existing = await db.select().from(threadSynths).where(and(eq(threadSynths.threadId, id), eq(threadSynths.synthId, synthId))).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const [row] = await db.update(threadSynths).set({
    synthReference: { ...existing[0].synthReference, ...body.synth_reference },
  }).where(eq(threadSynths.id, existing[0].id)).returning();
  return c.json(serializeRow(row));
});
