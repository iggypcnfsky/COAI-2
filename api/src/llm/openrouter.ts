import OpenAI from 'openai';
import { env } from '../env.js';
import { toOpenRouterModel } from '../../../shared/models.js';
import { decryptSecret } from '../lib/crypto.js';

export function createOpenRouterClient(userEncryptedKey?: string | null) {
  let apiKey = env.openrouterApiKey;
  if (userEncryptedKey) {
    try {
      apiKey = decryptSecret(userEncryptedKey);
    } catch {
      apiKey = env.openrouterApiKey;
    }
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': env.appUrl,
      'X-Title': 'COAI',
    },
  });
}

export async function completeText(opts: {
  client: OpenAI;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await opts.client.chat.completions.create({
    model: toOpenRouterModel(opts.model),
    messages: [{ role: 'user', content: opts.prompt }],
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.maxTokens ?? 4000,
  });
  return response.choices[0]?.message?.content ?? '';
}

export function cleanJsonResponse(content: string): string {
  if (!content) return '{}';
  return content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}
