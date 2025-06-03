import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key, Image, Brain, Search } from 'lucide-react';
import { setRunwareApiKey, removeRunwareApiKey } from '@/lib/api-utils';
// Import the Zustand store hook for API key management
import { useApiKey } from '@/hooks/store/useApiKey';
import { useAppStore } from '@/stores';

const ApiKeySettings: React.FC = () => {
  // Get API key state and methods from Zustand store
  const { openaiApiKey, setOpenaiApiKey, isApiKeyValid } = useApiKey();
  
  // Get Runware API key from store
  const tempApiKeys = useAppStore((state) => state.tempApiKeys);
  const setTempApiKey = useAppStore((state) => state.setTempApiKey);
  const removeTempApiKey = useAppStore((state) => state.removeTempApiKey);
  
  // Get API keys and check if they're valid
  const runwareApiKey = tempApiKeys.runware || '';
  const anthropicApiKey = tempApiKeys.anthropic || '';
  const perplexityApiKey = tempApiKeys.perplexity || '';
  const hasRunwareKey = runwareApiKey.trim().length > 0;
  const hasAnthropicKey = anthropicApiKey.trim().length > 0;
  const hasPerplexityKey = perplexityApiKey.trim().length > 0;
  
  // Local state for editing UI
  const [localOpenaiKey, setLocalOpenaiKey] = useState(openaiApiKey);
  const [localRunwareKey, setLocalRunwareKey] = useState(runwareApiKey);
  const [localAnthropicKey, setLocalAnthropicKey] = useState(anthropicApiKey);
  const [localPerplexityKey, setLocalPerplexityKey] = useState(perplexityApiKey);
  const [isEditingOpenai, setIsEditingOpenai] = useState(false);
  const [isEditingRunware, setIsEditingRunware] = useState(false);
  const [isEditingAnthropic, setIsEditingAnthropic] = useState(false);
  const [isEditingPerplexity, setIsEditingPerplexity] = useState(false);
  const [showOpenaiApiKey, setShowOpenaiApiKey] = useState(false);
  const [showRunwareApiKey, setShowRunwareApiKey] = useState(false);
  const [showAnthropicApiKey, setShowAnthropicApiKey] = useState(false);
  const [showPerplexityApiKey, setShowPerplexityApiKey] = useState(false);

  // Update local state when store values change
  useEffect(() => {
    setLocalOpenaiKey(openaiApiKey);
    setLocalRunwareKey(runwareApiKey);
    setLocalAnthropicKey(anthropicApiKey);
    setLocalPerplexityKey(perplexityApiKey);
  }, [openaiApiKey, runwareApiKey, anthropicApiKey, perplexityApiKey]);

  const handleSaveOpenaiKey = () => {
    if (localOpenaiKey.trim()) {
      setOpenaiApiKey(localOpenaiKey.trim());
      setIsEditingOpenai(false);
      setShowOpenaiApiKey(false);
    }
  };

  const handleRemoveOpenaiKey = () => {
    setOpenaiApiKey('');
    setLocalOpenaiKey('');
    setIsEditingOpenai(false);
  };

  const handleSaveRunwareKey = () => {
    if (localRunwareKey.trim()) {
      // Save to Zustand store
      setTempApiKey('runware', localRunwareKey.trim());
      
      // Also save to localStorage for backward compatibility
      setRunwareApiKey(localRunwareKey.trim());
      
      setIsEditingRunware(false);
      setShowRunwareApiKey(false);
    }
  };

  const handleRemoveRunwareKey = () => {
    // Remove from Zustand store
    removeTempApiKey('runware');
    
    // Also remove from localStorage
    removeRunwareApiKey();
    
    setLocalRunwareKey('');
    setIsEditingRunware(false);
  };

  const handleSaveAnthropicKey = () => {
    if (localAnthropicKey.trim()) {
      setTempApiKey('anthropic', localAnthropicKey.trim());
      setIsEditingAnthropic(false);
      setShowAnthropicApiKey(false);
    }
  };

  const handleRemoveAnthropicKey = () => {
    removeTempApiKey('anthropic');
    setLocalAnthropicKey('');
    setIsEditingAnthropic(false);
  };

  const handleSavePerplexityKey = () => {
    if (localPerplexityKey.trim()) {
      setTempApiKey('perplexity', localPerplexityKey.trim());
      setIsEditingPerplexity(false);
      setShowPerplexityApiKey(false);
    }
  };

  const handleRemovePerplexityKey = () => {
    removeTempApiKey('perplexity');
    setLocalPerplexityKey('');
    setIsEditingPerplexity(false);
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
          {!isApiKeyValid || isEditingOpenai ? (
            // Editing mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                <div className="relative">
                  <Input
                    id="openai-api-key"
                    type={showOpenaiApiKey ? 'text' : 'password'}
                    value={localOpenaiKey}
                    onChange={(e) => setLocalOpenaiKey(e.target.value)}
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
                <Button onClick={handleSaveOpenaiKey} disabled={!localOpenaiKey.trim()}>
                  Save Key
                </Button>
                {isApiKeyValid && (
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
                    value={localRunwareKey}
                    onChange={(e) => setLocalRunwareKey(e.target.value)}
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
                <Button onClick={handleSaveRunwareKey} disabled={!localRunwareKey.trim()}>
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

      {/* Anthropic API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Anthropic API Key
          </CardTitle>
          <CardDescription>
            Required for Claude models (Claude 3.5 Sonnet, Claude 4 Sonnet, Claude 4 Opus). Your key is stored locally and never sent to our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAnthropicKey || isEditingAnthropic ? (
            // Editing mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anthropic-api-key">Anthropic API Key</Label>
                <div className="relative">
                  <Input
                    id="anthropic-api-key"
                    type={showAnthropicApiKey ? 'text' : 'password'}
                    value={localAnthropicKey}
                    onChange={(e) => setLocalAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowAnthropicApiKey(!showAnthropicApiKey)}
                  >
                    {showAnthropicApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Anthropic Console
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveAnthropicKey} disabled={!localAnthropicKey.trim()}>
                  Save Key
                </Button>
                {hasAnthropicKey && (
                  <Button variant="outline" onClick={() => setIsEditingAnthropic(false)}>
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
                  <span className="font-mono text-sm">{maskKey(anthropicApiKey)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingAnthropic(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAnthropicKey}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Perplexity API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Perplexity API Key
          </CardTitle>
          <CardDescription>
            Required for Perplexity Sonar models with real-time web search capabilities. Your key is stored locally and never sent to our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasPerplexityKey || isEditingPerplexity ? (
            // Editing mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="perplexity-api-key">Perplexity API Key</Label>
                <div className="relative">
                  <Input
                    id="perplexity-api-key"
                    type={showPerplexityApiKey ? 'text' : 'password'}
                    value={localPerplexityKey}
                    onChange={(e) => setLocalPerplexityKey(e.target.value)}
                    placeholder="pplx-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPerplexityApiKey(!showPerplexityApiKey)}
                  >
                    {showPerplexityApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  Get your API key from{' '}
                  <a
                    href="https://www.perplexity.ai/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Perplexity API Settings
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSavePerplexityKey} disabled={!localPerplexityKey.trim()}>
                  Save Key
                </Button>
                {hasPerplexityKey && (
                  <Button variant="outline" onClick={() => setIsEditingPerplexity(false)}>
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
                  <span className="font-mono text-sm">{maskKey(perplexityApiKey)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPerplexity(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePerplexityKey}
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