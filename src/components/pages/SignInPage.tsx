import { SignIn, useAuth } from '@clerk/react';
import { AuthPageFrame } from '@/components/auth/AuthControls';
import { Link } from 'react-router-dom';

export function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <AuthPageFrame>
      {isLoaded && isSignedIn ? (
        <div className="text-center space-y-4 max-w-md">
          <h1 className="font-serif text-3xl">You’re already signed in</h1>
          <p className="text-[#a8a29a]">Continue into the studio, or sign out from the top right.</p>
          <Link
            to="/start"
            className="inline-flex items-center px-7 py-3 bg-[#c4a574] text-[#0b0b0c] font-medium tracking-wide hover:bg-[#d4b98a]"
          >
            Continue
          </Link>
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
