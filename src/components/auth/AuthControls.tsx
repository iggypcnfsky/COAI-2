import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { AccountMenu } from '@/components/account/AccountMenu';

export function AuthControls({ showContinue = false }: { showContinue?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <span className="text-xs text-neutral-400">…</span>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sign-in">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link to="/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {showContinue && (
        <Button size="sm" asChild>
          <Link to="/start">Continue</Link>
        </Button>
      )}
      <AccountMenu />
    </div>
  );
}

export function MarketingHeader({ showContinue = false }: { showContinue?: boolean }) {
  return (
    <header className="w-full bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-2 md:p-4 flex flex-row justify-between items-center">
      <Link to="/" className="flex items-center">
        <Logo
          size="24px"
          color="#6b7280"
          className="md:w-8 md:h-8"
          alt="Corals"
        />
        <span className="ml-2 text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Corals
        </span>
        <span className="inline-flex items-center px-2 py-1 ml-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
          beta
        </span>
      </Link>
      <AuthControls showContinue={showContinue} />
    </header>
  );
}

export function AuthPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />
      <div className="grid place-items-center px-6 py-16">{children}</div>
    </div>
  );
}
