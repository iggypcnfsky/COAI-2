import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env.js';
import { requireAuth } from './middleware/auth.js';
import { requireSubscription } from './middleware/subscription.js';
import { rateLimit } from './middleware/rateLimit.js';
import { meRoutes } from './routes/me.js';
import { synthRoutes } from './routes/synths.js';
import { teamRoutes } from './routes/teams.js';
import { threadRoutes } from './routes/threads.js';
import { messageRoutes } from './routes/messages.js';
import { documentRoutes } from './routes/documents.js';
import { chatRoutes } from './routes/chat.js';
import { generateRoutes } from './routes/generate.js';
import { billingRoutes } from './routes/billing.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = new Hono();

app.use('*', cors({
  origin: env.webOrigin.split(',').map((origin) => origin.trim()),
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.onError((err, c) => {
  console.error(err);
  if (err.name === 'ZodError') {
    return c.json({ error: 'Invalid request' }, 400);
  }
  return c.json({ error: 'An error occurred. Please try again.' }, 500);
});

app.get('/health', (c) => c.json({ ok: true, stripeMode: env.stripeMode }));
app.route('/api/v1/webhooks', webhookRoutes);

const authed = new Hono();
authed.use('*', requireAuth);
authed.route('/me', meRoutes);
authed.route('/billing', billingRoutes);

const gated = new Hono();
gated.use('*', requireSubscription);
gated.route('/synths', synthRoutes);
gated.route('/teams', teamRoutes);
gated.route('/threads', threadRoutes);
gated.route('/messages', messageRoutes);
gated.route('/documents', documentRoutes);
gated.use('/chat/*', rateLimit(30, 60_000));
gated.use('/generate/*', rateLimit(20, 60_000));
gated.route('/chat', chatRoutes);
gated.route('/generate', generateRoutes);

authed.route('/', gated);
app.route('/api/v1', authed);

serve({ fetch: app.fetch, port: env.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`COAI API listening on ${info.address}:${info.port} (stripe ${env.stripeMode})`);
});
