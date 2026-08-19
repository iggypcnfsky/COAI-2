import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { serializeRow } from '../lib/users.js';

export const documentRoutes = new Hono();

documentRoutes.get('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const rows = await db.select().from(documents).where(eq(documents.userId, clerkId)).orderBy(desc(documents.updatedAt));
  return c.json(rows.map(serializeRow));
});

documentRoutes.post('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({ document_data: z.record(z.unknown()) }).parse(await c.req.json());
  const [row] = await db.insert(documents).values({
    userId: clerkId,
    documentData: body.document_data,
  }).returning();
  return c.json(serializeRow(row), 201);
});

documentRoutes.patch('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const body = z.object({ document_data: z.record(z.unknown()) }).parse(await c.req.json());
  const existing = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, clerkId))).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const [row] = await db.update(documents).set({
    documentData: { ...existing[0].documentData, ...body.document_data },
    updatedAt: new Date(),
  }).where(eq(documents.id, id)).returning();
  return c.json(serializeRow(row));
});

documentRoutes.delete('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const deleted = await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, clerkId))).returning();
  if (!deleted[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});
