import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AuthPageFrame } from '@/components/auth/AuthControls';

export function PaywallPage() {
  async function openPortal() {
    const res = await apiFetch<{ url: string }>('/billing/portal', { method: 'POST' });
    if (res.url) window.location.assign(res.url);
  }

  return (
    <AuthPageFrame>
      <div className="max-w-md text-center space-y-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#c4a574]">Billing</p>
        <h1 className="font-serif text-4xl">Your trial or subscription needs attention</h1>
        <p className="text-[#a8a29a]">Update your payment method or restart a plan to keep using COAI.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={openPortal} className="bg-[#c4a574] text-[#0b0b0c] hover:bg-[#d4b98a]">
            Manage billing
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/subscribe')}>
            Start a new trial
          </Button>
        </div>
      </div>
    </AuthPageFrame>
  );
}
