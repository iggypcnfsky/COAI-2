import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { AccountMenu } from '@/components/account/AccountMenu';

interface SidebarBrandControlsProps {
  isBrowserCollapsed: boolean;
  onToggleBrowser: () => void;
}

export function SidebarBrandControls({
  isBrowserCollapsed,
  onToggleBrowser,
}: SidebarBrandControlsProps) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Logo
        size="24px"
        color="#6b7280"
        alt="Corals"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleBrowser}
        className="h-7 w-7 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        title={isBrowserCollapsed ? 'Show browser (⌘+B)' : 'Hide browser (⌘+B)'}
      >
        {isBrowserCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function SidebarAccountFooter({ isLoadingData = false }: { isLoadingData?: boolean }) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-neutral-200 dark:border-neutral-800">
      <AccountMenu />
      {isLoadingData && (
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin" />
          <span className="hidden md:inline">Syncing chats...</span>
        </div>
      )}
    </div>
  );
}

export function CollapsedSidebarRail({
  onToggleBrowser,
  isLoadingData = false,
}: {
  onToggleBrowser: () => void;
  isLoadingData?: boolean;
}) {
  return (
    <div className="w-12 shrink-0 h-full min-h-0 flex flex-col items-center py-3 gap-2 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <Logo size="24px" color="#6b7280" alt="Corals" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleBrowser}
        className="h-7 w-7 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        title="Show browser (⌘+B)"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
      {isLoadingData && (
        <div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin" />
      )}
      <div className="mt-auto">
        <AccountMenu compact />
      </div>
    </div>
  );
}
