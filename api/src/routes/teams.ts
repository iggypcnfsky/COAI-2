import { Hono } from 'hono';
import { and, desc, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { teamSynths, teams } from '../db/schema.js';
import { serializeRow } from '../lib/users.js';

export const teamRoutes = new Hono();

teamRoutes.get('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const rows = await db
    .select()
    .from(teams)
    .where(or(eq(teams.isPublic, true), eq(teams.userId, clerkId)))
    .orderBy(desc(teams.createdAt));
  return c.json(rows.map(serializeRow));
});

teamRoutes.get('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const rows = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  const row = rows[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (!row.isPublic && row.userId !== clerkId) return c.json({ error: 'Not found' }, 404);
  return c.json(serializeRow(row));
});

teamRoutes.post('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const body = z.object({ team_data: z.record(z.unknown()) }).parse(await c.req.json());
  const isPublic = body.team_data.isPublic !== false;
  const [row] = await db.insert(teams).values({
    userId: clerkId,
    teamData: { ...body.team_data, isPublic },
    isPublic,
  }).returning();
  return c.json(serializeRow(row), 201);
});

teamRoutes.patch('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const body = z.object({ team_data: z.record(z.unknown()) }).parse(await c.req.json());
  const existing = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.userId, clerkId))).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const merged = { ...existing[0].teamData, ...body.team_data };
  const isPublic = merged.isPublic !== false;
  const [row] = await db.update(teams).set({
    teamData: merged,
    isPublic,
    updatedAt: new Date(),
  }).where(eq(teams.id, id)).returning();
  return c.json(serializeRow(row));
});

teamRoutes.delete('/:id', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const deleted = await db.delete(teams).where(and(eq(teams.id, id), eq(teams.userId, clerkId))).returning();
  if (!deleted[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

teamRoutes.get('/:id/synths', async (c) => {
  const id = c.req.param('id');
  const rows = await db.select().from(teamSynths).where(eq(teamSynths.teamId, id));
  return c.json(rows.map(serializeRow));
});

teamRoutes.post('/:id/synths', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const team = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.userId, clerkId))).limit(1);
  if (!team[0]) return c.json({ error: 'Not found' }, 404);
  const body = z.object({
    synth_id: z.string().uuid().nullable().optional(),
    synth_reference: z.record(z.unknown()),
  }).parse(await c.req.json());
  const [row] = await db.insert(teamSynths).values({
    teamId: id,
    synthId: body.synth_id ?? (typeof body.synth_reference.synthId === 'string' ? body.synth_reference.synthId : null),
    synthReference: body.synth_reference,
  }).returning();
  return c.json(serializeRow(row), 201);
});

teamRoutes.delete('/:id/synths/:synthId', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const synthId = c.req.param('synthId');
  const team = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.userId, clerkId))).limit(1);
  if (!team[0]) return c.json({ error: 'Not found' }, 404);
  await db.delete(teamSynths).where(and(eq(teamSynths.teamId, id), eq(teamSynths.synthId, synthId)));
  return c.json({ ok: true });
});

teamRoutes.patch('/:id/synths/:synthId', async (c) => {
  const { clerkId } = c.get('authUser');
  const id = c.req.param('id');
  const synthId = c.req.param('synthId');
  const team = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.userId, clerkId))).limit(1);
  if (!team[0]) return c.json({ error: 'Not found' }, 404);
  const body = z.object({ synth_reference: z.record(z.unknown()) }).parse(await c.req.json());
  const existing = await db.select().from(teamSynths).where(and(eq(teamSynths.teamId, id), eq(teamSynths.synthId, synthId))).limit(1);
  if (!existing[0]) return c.json({ error: 'Not found' }, 404);
  const [row] = await db.update(teamSynths).set({
    synthReference: { ...existing[0].synthReference, ...body.synth_reference },
  }).where(eq(teamSynths.id, existing[0].id)).returning();
  return c.json(serializeRow(row));
});
