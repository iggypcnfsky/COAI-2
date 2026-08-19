import { SignIn, useAuth } from '@clerk/react';
import { AuthPageFrame } from '@/components/auth/AuthControls';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <AuthPageFrame>
      {isLoaded && isSignedIn ? (
        <div className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">You’re already signed in</h1>
          <p className="text-sm text-neutral-500">Continue into the studio, or sign out from the account menu.</p>
          <Button asChild>
            <Link to="/start">Continue</Link>
          </Button>
        </div>
      ) : (
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/start"
        />
      )}
    </AuthPageFrame>
  );
}
