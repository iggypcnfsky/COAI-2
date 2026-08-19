import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';
import { useAppStore } from '@/stores/appStore';

const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  trialing: { label: 'Trialing', detail: 'Your trial is active. Manage the card on file or cancel anytime.' },
  active: { label: 'Active', detail: 'Your subscription is in good standing.' },
  past_due: { label: 'Past due', detail: 'Update your payment method to keep using COAI.' },
  canceled: { label: 'Canceled', detail: 'Restart a plan to reopen the studio.' },
  unpaid: { label: 'Unpaid', detail: 'Update billing to restore access.' },
  none: { label: 'No plan', detail: 'Start a trial to use the studio. Card on file, cancel anytime.' },
};

export function BillingPage() {
  const subscriptionStatus = useAppStore((s) => s.subscriptionStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = STATUS_COPY[subscriptionStatus] ?? {
    label: subscriptionStatus || 'Unknown',
    detail: 'Manage your plan in the Stripe billing portal.',
  };

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>('/billing/portal', { method: 'POST' });
      if (res.url) window.location.assign(res.url);
      else setError('Billing portal is not available yet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md space-y-5 p-1 font-sans text-neutral-900">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-neutral-500">{copy.detail}</p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
        <span className="text-neutral-500">Status</span>
        <div className="mt-0.5 font-medium">{copy.label}</div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {subscriptionStatus === 'none' ? (
          <Button onClick={() => window.location.assign('/subscribe')} disabled={busy}>
            Start trial
          </Button>
        ) : (
          <Button onClick={() => void openPortal()} disabled={busy}>
            <CreditCard className="mr-2 h-4 w-4" />
            {busy ? 'Opening…' : 'Manage billing'}
          </Button>
        )}
      </div>
    </div>
  );
}
