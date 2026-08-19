import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key } from 'lucide-react';
import { useAppStore } from '@/stores';
import { apiFetch } from '@/lib/api/client';

const ApiKeySettings: React.FC = () => {
  const hasByok = useAppStore((state) => state.hasByok);
  const saveApiKey = useAppStore((state) => state.saveApiKey);
  const removeApiKey = useAppStore((state) => state.removeApiKey);
  const [localKey, setLocalKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveApiKey('openrouter', localKey.trim());
      setLocalKey('');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeApiKey('openrouter');
      setLocalKey('');
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    const res = await apiFetch<{ url: string }>('/billing/portal', { method: 'POST' });
    if (res.url) window.location.assign(res.url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenRouter</CardTitle>
        <CardDescription>
          Platform models are included with your subscription. Optionally bring your own OpenRouter key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="openrouter-key">OpenRouter API Key (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="openrouter-key"
              type={showKey ? 'text' : 'password'}
              placeholder={hasByok ? 'Key on file — paste to replace' : 'sk-or-...'}
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((v) => !v)}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasByok ? 'A personal key is stored encrypted on the server.' : 'Empty = platform key.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={busy || !localKey.trim()}>
            <Key className="h-4 w-4 mr-2" />
            Save key
          </Button>
          {hasByok && (
            <Button variant="outline" onClick={handleRemove} disabled={busy}>
              Use platform key
            </Button>
          )}
          <Button variant="ghost" onClick={openPortal}>
            Manage billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeySettings;
