import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key, Image } from 'lucide-react';
import { getOpenAIApiKey, setOpenAIApiKey, removeOpenAIApiKey, hasOpenAIApiKey, getRunwareApiKey, setRunwareApiKey, removeRunwareApiKey, hasRunwareApiKey } from '@/lib/api-utils';

const ApiKeySettings: React.FC = () => {
  // OpenAI API Key state
  const [openaiApiKey, setOpenaiApiKeyState] = useState('');
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [isEditingOpenai, setIsEditingOpenai] = useState(false);
  const [showOpenaiApiKey, setShowOpenaiApiKey] = useState(false);

  // Runware API Key state
  const [runwareApiKey, setRunwareApiKeyState] = useState('');
  const [hasRunwareKey, setHasRunwareKey] = useState(false);
  const [isEditingRunware, setIsEditingRunware] = useState(false);
  const [showRunwareApiKey, setShowRunwareApiKey] = useState(false);

  useEffect(() => {
    // Check if OpenAI API keys exist
    setHasOpenaiKey(hasOpenAIApiKey());
    if (hasOpenAIApiKey()) {
      const key = getOpenAIApiKey();
      setOpenaiApiKeyState(key || '');
    }

    // Check if Runware API keys exist
    setHasRunwareKey(hasRunwareApiKey());
    if (hasRunwareApiKey()) {
      const key = getRunwareApiKey();
      setRunwareApiKeyState(key || '');
    }
  }, []);

  const handleSaveOpenaiKey = () => {
    if (openaiApiKey.trim()) {
      setOpenAIApiKey(openaiApiKey.trim());
      setHasOpenaiKey(true);
      setIsEditingOpenai(false);
      setShowOpenaiApiKey(false);
    }
  };

  const handleRemoveOpenaiKey = () => {
    removeOpenAIApiKey();
    setOpenaiApiKeyState('');
    setHasOpenaiKey(false);
    setIsEditingOpenai(false);
  };

  const handleSaveRunwareKey = () => {
    if (runwareApiKey.trim()) {
      setRunwareApiKey(runwareApiKey.trim());
      setHasRunwareKey(true);
      setIsEditingRunware(false);
      setShowRunwareApiKey(false);
    }
  };

  const handleRemoveRunwareKey = () => {
    removeRunwareApiKey();
    setRunwareApiKeyState('');
    setHasRunwareKey(false);
    setIsEditingRunware(false);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(Math.max(0, key.length - 8)) + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      {/* OpenAI API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Key
          </CardTitle>
          <CardDescription>
            Required for AI-powered synth and team text generation. Your key is stored locally and never sent to our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasOpenaiKey || isEditingOpenai ? (
            // Editing mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                <div className="relative">
                  <Input
                    id="openai-api-key"
                    type={showOpenaiApiKey ? 'text' : 'password'}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKeyState(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowOpenaiApiKey(!showOpenaiApiKey)}
                  >
                    {showOpenaiApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveOpenaiKey} disabled={!openaiApiKey.trim()}>
                  Save Key
                </Button>
                {hasOpenaiKey && (
                  <Button variant="outline" onClick={() => setIsEditingOpenai(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Display mode
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-mono text-sm">{maskKey(openaiApiKey)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingOpenai(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveOpenaiKey}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Runware API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Runware API Key
          </CardTitle>
          <CardDescription>
            Required for AI-powered image generation (synth profiles and team photos). Your key is stored locally and never sent to our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasRunwareKey || isEditingRunware ? (
            // Editing mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="runware-api-key">Runware API Key</Label>
                <div className="relative">
                  <Input
                    id="runware-api-key"
                    type={showRunwareApiKey ? 'text' : 'password'}
                    value={runwareApiKey}
                    onChange={(e) => setRunwareApiKeyState(e.target.value)}
                    placeholder="Enter your Runware API key..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowRunwareApiKey(!showRunwareApiKey)}
                  >
                    {showRunwareApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  Get your API key from{' '}
                  <a
                    href="https://runware.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Runware Platform
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveRunwareKey} disabled={!runwareApiKey.trim()}>
                  Save Key
                </Button>
                {hasRunwareKey && (
                  <Button variant="outline" onClick={() => setIsEditingRunware(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Display mode
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-mono text-sm">{maskKey(runwareApiKey)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingRunware(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveRunwareKey}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeySettings; 