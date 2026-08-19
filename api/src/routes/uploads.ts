import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threads } from '../db/schema.js';
import {
  ALLOWED_IMAGE_TYPES,
  chatObjectKey,
  hydrateStoredImage,
  isOwnedChatKey,
  isS3Configured,
  maxUploadBytes,
  presignGet,
  putChatImage,
} from '../lib/s3.js';

export const uploadRoutes = new Hono();

uploadRoutes.post('/', async (c) => {
  if (!isS3Configured()) {
    return c.json({ error: 'Image uploads are not configured' }, 503);
  }

  const { clerkId } = c.get('authUser');
  const form = await c.req.formData();
  const threadId = String(form.get('threadId') || '');
  const file = form.get('file');

  if (!threadId) return c.json({ error: 'threadId required' }, 400);
  if (!file || typeof file === 'string') return c.json({ error: 'file required' }, 400);

  const owned = await db.select({ id: threads.id }).from(threads).where(and(
    eq(threads.id, threadId),
    eq(threads.userId, clerkId),
  )).limit(1);
  if (!owned[0]) return c.json({ error: 'Not found' }, 404);

  const contentType = (file.type || '').toLowerCase();
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) return c.json({ error: 'Unsupported image type' }, 400);

  const size = 'size' in file ? Number(file.size) : 0;
  if (size <= 0 || size > maxUploadBytes()) {
    return c.json({ error: 'Image must be between 1 byte and 8MB' }, 400);
  }

  const body = Buffer.from(await file.arrayBuffer());
  const key = chatObjectKey(clerkId, threadId, ext);
  await putChatImage({ key, body, contentType });
  const url = await presignGet(key);
  const name = 'name' in file && typeof file.name === 'string' ? file.name : `image.${ext}`;

  return c.json({ key, url, name, size, type: contentType }, 201);
});

uploadRoutes.get('/sign', async (c) => {
  if (!isS3Configured()) {
    return c.json({ error: 'Image uploads are not configured' }, 503);
  }

  const { clerkId } = c.get('authUser');
  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key required' }, 400);
  if (!isOwnedChatKey(key, clerkId)) return c.json({ error: 'Not found' }, 404);

  const image = await hydrateStoredImage({ key }, clerkId);
  return c.json({ key, url: image?.url || await presignGet(key) });
});
