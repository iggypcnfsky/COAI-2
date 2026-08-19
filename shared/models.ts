export interface ModelOption {
  id: string;
  label: string;
  openrouter: string;
}

export const MODEL_CATALOG: ModelOption[] = [
  { id: 'gpt-4o', label: 'GPT-4o', openrouter: 'openai/gpt-4o' },
  { id: 'gpt-4.1', label: 'GPT-4.1', openrouter: 'openai/gpt-4.1' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', openrouter: 'openai/gpt-4.1-nano' },
  { id: 'chatgpt-4o-latest', label: 'ChatGPT-4o Latest', openrouter: 'openai/chatgpt-4o-latest' },
  { id: 'o4-mini', label: 'o4 Mini', openrouter: 'openai/o4-mini' },
  { id: 'o3', label: 'o3', openrouter: 'openai/o3' },
  { id: 'o1', label: 'o1', openrouter: 'openai/o1' },
  { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', openrouter: 'anthropic/claude-3.5-sonnet' },
  { id: 'claude-4-sonnet', label: 'Claude 4 Sonnet', openrouter: 'anthropic/claude-sonnet-4' },
  { id: 'claude-4-opus', label: 'Claude 4 Opus', openrouter: 'anthropic/claude-opus-4' },
  { id: 'sonar', label: 'Perplexity Sonar', openrouter: 'perplexity/sonar' },
  { id: 'sonar-pro', label: 'Perplexity Sonar Pro', openrouter: 'perplexity/sonar-pro' },
  { id: 'sonar-reasoning', label: 'Perplexity Sonar Reasoning', openrouter: 'perplexity/sonar-reasoning' },
  { id: 'sonar-reasoning-pro', label: 'Perplexity Sonar Reasoning Pro', openrouter: 'perplexity/sonar-reasoning-pro' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', openrouter: 'google/gemini-2.5-flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', openrouter: 'google/gemini-2.5-pro' },
];

export const DEFAULT_MODEL_ID = 'claude-3-5-sonnet';

export const MODEL_IDS = MODEL_CATALOG.map((m) => m.id);

export type ModelId = (typeof MODEL_CATALOG)[number]['id'];

export function toOpenRouterModel(id: string): string {
  const match = MODEL_CATALOG.find((m) => m.id === id);
  if (match) return match.openrouter;
  if (id.includes('/')) return id;
  return 'openai/gpt-4o';
}

export function isKnownModel(id: string): boolean {
  return MODEL_CATALOG.some((m) => m.id === id);
}
