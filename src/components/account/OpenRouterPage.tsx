import { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/appStore';
import { MODEL_CATALOG } from '@shared/models';

export function OpenRouterPage() {
  const hasByok = useAppStore((s) => s.hasByok);
  const saveApiKey = useAppStore((s) => s.saveApiKey);
  const removeApiKey = useAppStore((s) => s.removeApiKey);
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const [localKey, setLocalKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hiddenModelIds = profile?.profile_data?.preferences?.hiddenModelIds ?? [];
  const visibleCount = MODEL_CATALOG.filter((m) => !hiddenModelIds.includes(m.id)).length;

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const result = await saveApiKey('openrouter', localKey.trim());
      if (result.error) setError(result.error.message);
      else setLocalKey('');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      const result = await removeApiKey('openrouter');
      if (result.error) setError(result.error.message);
      else setLocalKey('');
    } finally {
      setBusy(false);
    }
  }

  async function setModelVisible(id: string, visible: boolean) {
    const nextHidden = visible
      ? hiddenModelIds.filter((hidden) => hidden !== id)
      : hiddenModelIds.includes(id)
        ? hiddenModelIds
        : [...hiddenModelIds, id];

    if (nextHidden.length >= MODEL_CATALOG.length) {
      setError('Keep at least one model visible for new synths.');
      return;
    }

    setSavingModels(true);
    setError(null);
    try {
      const result = await updateProfile({
        preferences: {
          ...profile?.profile_data?.preferences,
          hiddenModelIds: nextHidden,
        },
      });
      if (result.error) setError(result.error.message);
    } finally {
      setSavingModels(false);
    }
  }

  return (
    <div className="max-w-md space-y-6 p-1 font-sans text-neutral-900">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">OpenRouter</h1>
        <p className="text-sm text-neutral-500">
          Platform models are included with your subscription. Optionally bring your own key — it is stored encrypted.
        </p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
        {hasByok ? (
          <span className="font-medium text-green-700">Personal key on file</span>
        ) : (
          <span className="text-neutral-600">Using the platform key</span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="openrouter-key">API key {hasByok ? '(replace)' : '(optional)'}</Label>
        <div className="flex gap-2">
          <Input
            id="openrouter-key"
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            placeholder={hasByok ? 'Paste a new key to replace' : 'sk-or-...'}
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} disabled={busy || !localKey.trim()}>
          <Key className="mr-2 h-4 w-4" />
          {busy ? 'Saving…' : 'Save key'}
        </Button>
        {hasByok && (
          <Button variant="outline" onClick={() => void handleRemove()} disabled={busy}>
            Use platform key
          </Button>
        )}
      </div>

      <div className="space-y-3 border-t border-neutral-200 pt-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">Models for new synths</h2>
          <p className="text-sm text-neutral-500">
            Show or hide which models appear when creating a synth. {visibleCount} visible.
          </p>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2">
          {MODEL_CATALOG.map((model) => {
            const visible = !hiddenModelIds.includes(model.id);
            return (
              <label
                key={model.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{model.label}</span>
                  <span className="block truncate text-xs text-neutral-500">{model.openrouter}</span>
                </span>
                <Switch
                  checked={visible}
                  disabled={savingModels}
                  onCheckedChange={(checked) => void setModelVisible(model.id, checked)}
                  aria-label={`${visible ? 'Hide' : 'Show'} ${model.label}`}
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
