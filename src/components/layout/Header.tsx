import React from 'react';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { AccountMenu } from '@/components/account/AccountMenu';

interface HeaderProps {
  isBrowserCollapsed: boolean;
  onToggleBrowser: () => void;
  isLoadingData?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isBrowserCollapsed, onToggleBrowser, isLoadingData = false }) => {
  return (
    <header className="w-full bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-2 md:p-4 flex flex-row justify-between items-center">
      <div className="flex items-center">
        <Logo
          size="24px"
          color="#6b7280"
          className="md:w-8 md:h-8"
        />
        <a
          href="https://tally.so/r/nWB1ON"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-2 py-1 ml-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors text-xs font-medium"
        >
          beta
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleBrowser}
          className="ml-1 h-6 w-6 md:h-8 md:w-8 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          title={isBrowserCollapsed ? 'Show browser (⌘+B)' : 'Hide browser (⌘+B)'}
        >
          {isBrowserCollapsed ? (
            <PanelLeftOpen className="h-3 w-3 md:h-4 md:w-4" />
          ) : (
            <PanelLeftClose className="h-3 w-3 md:h-4 md:w-4" />
          )}
        </Button>
        {isLoadingData && (
          <div className="flex items-center gap-2 ml-3 px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden md:inline">Syncing chats...</span>
          </div>
        )}
      </div>

      <AccountMenu />
    </header>
  );
};

export default Header;
