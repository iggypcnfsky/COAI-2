export interface ModelOption {
  id: string;
  label: string;
  openrouter: string;
}

export const MODEL_CATALOG: ModelOption[] = [
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', openrouter: 'google/gemini-3.7-flash' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', openrouter: 'openai/gpt-5.6-luna' },
  { id: 'gpt-oss-safeguard-20b', label: 'GPT OSS Safeguard 20B', openrouter: 'openai/gpt-oss-safeguard-20b' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', openrouter: 'anthropic/claude-sonnet-5' },
  { id: 'kimi-k3', label: 'Kimi K3', openrouter: 'moonshotai/kimi-k3' },
];

export const DEFAULT_MODEL_ID = 'gemini-3.7-flash';

export const MODEL_IDS = MODEL_CATALOG.map((m) => m.id);

export type ModelId = (typeof MODEL_CATALOG)[number]['id'];

const LEGACY_OPENROUTER: Record<string, string> = {
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-nano': 'openai/gpt-4.1-nano',
  'chatgpt-4o-latest': 'openai/chatgpt-4o-latest',
  'o4-mini': 'openai/o4-mini',
  'o3': 'openai/o3',
  'o1': 'openai/o1',
  'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-4-sonnet': 'anthropic/claude-sonnet-4',
  'claude-4-opus': 'anthropic/claude-opus-4',
  'sonar': 'perplexity/sonar',
  'sonar-pro': 'perplexity/sonar-pro',
  'sonar-reasoning': 'perplexity/sonar-reasoning',
  'sonar-reasoning-pro': 'perplexity/sonar-reasoning-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
};

export function toOpenRouterModel(id: string): string {
  const match = MODEL_CATALOG.find((m) => m.id === id);
  if (match) return match.openrouter;
  if (LEGACY_OPENROUTER[id]) return LEGACY_OPENROUTER[id];
  if (id.includes('/')) return id;
  const fallback = MODEL_CATALOG.find((m) => m.id === DEFAULT_MODEL_ID);
  return fallback?.openrouter ?? id;
}

export function isKnownModel(id: string): boolean {
  return MODEL_CATALOG.some((m) => m.id === id);
}

export function visibleCatalog(hiddenIds?: string[] | null, includeId?: string): ModelOption[] {
  const hidden = new Set(hiddenIds ?? []);
  const visible = MODEL_CATALOG.filter((m) => !hidden.has(m.id) || m.id === includeId);
  if (includeId && !visible.some((m) => m.id === includeId)) {
    const legacy = LEGACY_OPENROUTER[includeId];
    visible.unshift({
      id: includeId,
      label: includeId,
      openrouter: legacy || includeId,
    });
  }
  if (visible.length > 0) return visible;
  const fallback = MODEL_CATALOG.find((m) => m.id === includeId) || MODEL_CATALOG.find((m) => m.id === DEFAULT_MODEL_ID);
  return fallback ? [fallback] : MODEL_CATALOG.slice(0, 1);
}
