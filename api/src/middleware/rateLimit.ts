import type { Context, Next } from 'hono';

const windows = new Map<string, number[]>();

export function rateLimit(max: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const authUser = c.get('authUser');
    const key = authUser?.clerkId || c.req.header('x-forwarded-for') || 'anon';
    const now = Date.now();
    const stamps = (windows.get(key) || []).filter((t) => now - t < windowMs);
    if (stamps.length >= max) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    stamps.push(now);
    windows.set(key, stamps);
    await next();
  };
}
