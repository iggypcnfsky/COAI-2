import { Hono } from 'hono';
import { and, desc, eq, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { messages, threads } from '../db/schema.js';
import { serializeRow } from '../lib/users.js';
import { hydrateStoredImage, stripVolatileImageFields, type StoredImage } from '../lib/s3.js';

export const messageRoutes = new Hono();

async function assertThread(clerkId: string, threadId: string) {
  const rows = await db.select().from(threads).where(and(eq(threads.id, threadId), eq(threads.userId, clerkId))).limit(1);
  return rows[0] ?? null;
}

function persistableMessageData(messageData: Record<string, unknown>) {
  const image = messageData.image as StoredImage | undefined;
  if (!image) return messageData;
  const cleaned = stripVolatileImageFields(image) || {};
  if (cleaned.url?.startsWith('data:') || cleaned.url === '[Image removed to save storage]') {
    return {
      ...messageData,
      image: {
        ...cleaned,
        url: cleaned.url?.startsWith('http') ? cleaned.url : '',
        _wasStripped: !cleaned.key,
      },
    };
  }
  return { ...messageData, image: cleaned };
}

async function serializeMessage(row: typeof messages.$inferSelect, clerkId: string) {
  const data = { ...(row.messageData as Record<string, unknown>) };
  if (data.image && typeof data.image === 'object') {
    data.image = await hydrateStoredImage(data.image as StoredImage, clerkId);
  }
  return serializeRow({ ...row, messageData: data });
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
  return c.json(await Promise.all(rows.map((row) => serializeMessage(row, clerkId))));
});

messageRoutes.get('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const rows = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  const thread = await assertThread(clerkId, rows[0].threadId);
  if (!thread) return c.json({ error: 'Not found' }, 404);
  return c.json(await serializeMessage(rows[0], clerkId));
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
    messageData: persistableMessageData(body.message_data),
  }).returning();
  return c.json(await serializeMessage(row, clerkId), 201);
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
    messageData: persistableMessageData({ ...existing[0].messageData, ...body.message_data }),
  }).where(eq(messages.id, id)).returning();
  return c.json(await serializeMessage(row, clerkId));
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
