import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { getUserByClerkId } from '../lib/users.js';
import { createOpenRouterClient } from '../llm/openrouter.js';
import { DEFAULT_MODEL_ID, toOpenRouterModel } from '../../../shared/models.js';

export const chatRoutes = new Hono();

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.unknown(),
    image: z.unknown().optional(),
  })),
  role: z.string().optional(),
  model: z.string().default(DEFAULT_MODEL_ID),
  employeePrompt: z.string().optional(),
  employeeName: z.string().optional(),
});

chatRoutes.post('/', async (c) => {
  const { clerkId } = c.get('authUser');
  const user = await getUserByClerkId(clerkId);
  const body = chatSchema.parse(await c.req.json());
  const client = createOpenRouterClient(user?.openrouterKeyEncrypted);

  const system = body.employeePrompt || `You are ${body.employeeName || body.role || 'a team member'}.`;
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }> = [
    { role: 'system', content: system },
  ];

  for (const message of body.messages) {
    const role = message.role === 'assistant' ? 'assistant' : 'user';
    if (message.image && typeof message.image === 'object') {
      const image = message.image as { base64?: string; type?: string; url?: string };
      const url = image.url && /^https?:\/\//i.test(image.url)
        ? image.url
        : (image.base64 ? `data:${image.type || 'image/png'};base64,${image.base64}` : null);
      if (url) {
        messages.push({
          role,
          content: [
            { type: 'text', text: String(message.content ?? '') },
            { type: 'image_url', image_url: { url } },
          ],
        });
        continue;
      }
    }
    messages.push({ role, content: message.content as string });
  }

  const completion = await client.chat.completions.create({
    model: toOpenRouterModel(body.model),
    stream: true,
    max_tokens: 4000,
    messages: messages as never,
  });

  return streamSSE(c, async (stream) => {
    for await (const chunk of completion) {
      await stream.writeSSE({ data: JSON.stringify(chunk) });
    }
    await stream.writeSSE({ data: '[DONE]' });
  });
});
