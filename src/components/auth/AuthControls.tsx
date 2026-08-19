import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/react';

export function AuthControls({ showContinue = false }: { showContinue?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <span className="text-xs uppercase tracking-[0.2em] text-[#5c5a57]">…</span>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        <Link
          to="/sign-in"
          className="text-sm tracking-widest uppercase text-[#a8a29a] hover:text-[#e8e2d6]"
        >
          Sign in
        </Link>
        <Link
          to="/sign-up"
          className="text-sm tracking-widest uppercase px-3 py-1.5 bg-[#c4a574] text-[#0b0b0c] hover:bg-[#d4b98a]"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {user?.primaryEmailAddress?.emailAddress && (
        <span className="hidden sm:inline text-xs text-[#a8a29a] max-w-[16rem] truncate">
          {user.primaryEmailAddress.emailAddress}
        </span>
      )}
      {showContinue && (
        <Link
          to="/start"
          className="text-sm tracking-widest uppercase text-[#c4a574] hover:text-[#d4b98a]"
        >
          Continue
        </Link>
      )}
      <button
        type="button"
        onClick={() => void signOut({ redirectUrl: '/' })}
        className="text-sm tracking-widest uppercase text-[#a8a29a] hover:text-[#e8e2d6]"
      >
        Sign out
      </button>
    </div>
  );
}

export function AuthPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e8e2d6]">
      <header className="flex items-center justify-between px-6 md:px-12 py-6">
        <Link to="/" className="font-serif text-xl tracking-wide">
          COAI
        </Link>
        <AuthControls />
      </header>
      <div className="grid place-items-center px-6 pb-16">{children}</div>
    </div>
  );
}
