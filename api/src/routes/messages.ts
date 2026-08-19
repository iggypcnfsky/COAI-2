import { Hono } from 'hono';
import { and, desc, eq, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { messages, threads } from '../db/schema.js';
import { serializeRow } from '../lib/users.js';

export const messageRoutes = new Hono();

async function assertThread(clerkId: string, threadId: string) {
  const rows = await db.select().from(threads).where(and(eq(threads.id, threadId), eq(threads.userId, clerkId))).limit(1);
  return rows[0] ?? null;
}

messageRoutes.get('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const threadId = c.req.query('threadId');
  if (!threadId) return c.json({ error: 'threadId required' }, 400);
  const thread = await assertThread(clerkId, threadId);
  if (!thread) return c.json({ error: 'Not found' }, 404);
  const limit = Number(c.req.query('limit') || 50);
  const before = c.req.query('before');
  const rows = before
    ? await db.select().from(messages).where(and(eq(messages.threadId, threadId), lt(messages.createdAt, new Date(before)))).orderBy(desc(messages.createdAt)).limit(limit)
    : await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(desc(messages.createdAt)).limit(limit);
  return c.json(rows.map(serializeRow));
});

messageRoutes.get('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const rows = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  const thread = await assertThread(clerkId, rows[0].threadId);
  if (!thread) return c.json({ error: 'Not found' }, 404);
  return c.json(serializeRow(rows[0]));
});

messageRoutes.post('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({
    thread_id: z.string().uuid(),
    message_data: z.record(z.unknown()),
  }).parse(await c.req.json());
  const thread = await assertThread(clerkId, body.thread_id);
  if (!thread) return c.json({ error: 'Not found' }, 404);
  const [row] = await db.insert(messages).values({
    threadId: body.thread_id,
    messageData: body.message_data,
  }).returning();
  return c.json(serializeRow(row), 201);
});

messageRoutes.patch('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const body = z.object({ message_data: z.record(z.unknown()) }).parse(await c.req.json());
  const existing = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const thread = await assertThread(clerkId, existing[0].threadId);
  if (!thread) return c.json({ error: 'Not found' }, 404);
  const [row] = await db.update(messages).set({
    messageData: { ...existing[0].messageData, ...body.message_data },
  }).where(eq(messages.id, id)).returning();
  return c.json(serializeRow(row));
});

messageRoutes.delete('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const existing = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const thread = await assertThread(clerkId, existing[0].threadId);
  if (!thread) return c.json({ error: 'Not found' }, 404);
  await db.delete(messages).where(eq(messages.id, id));
  return c.json({ ok: true });
});
