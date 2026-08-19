import React, { useState } from 'react';
import { UserButton } from '@clerk/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Key, Check, PanelLeftOpen, CreditCard } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAppStore } from '@/stores/appStore';
import { apiFetch } from '@/lib/api/client';

interface HeaderProps {
  isBrowserCollapsed: boolean;
  onToggleBrowser: () => void;
  isLoadingData?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isBrowserCollapsed, onToggleBrowser, isLoadingData = false }) => {
  const hasByok = useAppStore((s) => s.hasByok);
  const saveApiKey = useAppStore((s) => s.saveApiKey);
  const removeApiKey = useAppStore((s) => s.removeApiKey);
  const [open, setOpen] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      if (keyValue.trim()) {
        await saveApiKey('openrouter', keyValue.trim());
      } else {
        await removeApiKey('openrouter');
      }
      setKeyValue('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function openPortal() {
    const res = await apiFetch<{ url: string }>('/billing/portal', { method: 'POST' });
    if (res.url) window.location.assign(res.url);
  }

  return (
    <header className="w-full bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-2 md:p-4 flex flex-row justify-between items-center">
      <div className="flex items-center">
        <Logo
          size="24px"
          color="#6b7280"
          className="md:w-8 md:h-8 mr-1 md:mr-2"
        />
        <a
          href="https://iggy.love"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs font-medium"
        >
          by iggylove
        </a>
        <a
          href="https://tally.so/r/nWB1ON"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-2 py-1 ml-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors text-xs font-medium"
        >
          beta
        </a>
        {isLoadingData && (
          <div className="flex items-center gap-2 ml-3 px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden md:inline">Syncing chats...</span>
          </div>
        )}
        {isBrowserCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleBrowser}
            className="ml-2 h-6 w-6 md:h-8 md:w-8 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            title="Show browser (⌘+B)"
          >
            <PanelLeftOpen className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-row space-x-2 items-center">
        <Button variant="ghost" size="sm" onClick={openPortal} className="hidden md:inline-flex gap-2">
          <CreditCard className="h-4 w-4" />
          Billing
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant={hasByok ? 'outline' : 'ghost'}
              className={`flex items-center gap-2 ${hasByok ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}`}
            >
              <Key className="h-4 w-4" />
              {hasByok ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="hidden md:inline">BYOK</span>
                </>
              ) : (
                <span className="hidden md:inline">OpenRouter</span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>OpenRouter key</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-neutral-500">
                Optional. Leave empty to use the platform key. A subscription is still required.
              </p>
              <Input
                type="password"
                placeholder={hasByok ? 'Replace existing key' : 'sk-or-...'}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                {hasByok && (
                  <Button variant="outline" onClick={() => { setKeyValue(''); void handleSave(); }} disabled={saving}>
                    Remove
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <UserButton />
      </div>
    </header>
  );
};

export default Header;
