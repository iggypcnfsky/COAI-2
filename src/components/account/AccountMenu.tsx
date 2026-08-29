import { UserButton } from '@clerk/react';
import { CreditCard, Key } from 'lucide-react';
import { BillingPage } from './BillingPage';
import { OpenRouterPage } from './OpenRouterPage';

function OpenRouterIcon() {
  return <Key className="h-4 w-4" />;
}

function BillingIcon() {
  return <CreditCard className="h-4 w-4" />;
}

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const size = compact ? '1.75rem' : '2rem';
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: { width: size, height: size },
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Action label="OpenRouter" labelIcon={<OpenRouterIcon />} open="openrouter" />
        <UserButton.Action label="Billing" labelIcon={<BillingIcon />} open="subscription" />
      </UserButton.MenuItems>
      <UserButton.UserProfilePage label="OpenRouter" url="openrouter" labelIcon={<OpenRouterIcon />}>
        <OpenRouterPage />
      </UserButton.UserProfilePage>
      <UserButton.UserProfilePage label="Billing" url="subscription" labelIcon={<BillingIcon />}>
        <BillingPage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
