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
      <div className="w-full max-w-md space-y-5 rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Billing</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your trial or subscription needs attention</h1>
        <p className="text-sm text-neutral-500">Update your payment method or restart a plan to keep using COAI.</p>
        <div className="flex flex-col gap-2">
          <Button onClick={openPortal}>Manage billing</Button>
          <Button variant="ghost" onClick={() => window.location.assign('/subscribe')}>
            Start a new trial
          </Button>
        </div>
      </div>
    </AuthPageFrame>
  );
}
