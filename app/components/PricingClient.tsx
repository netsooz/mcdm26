'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { PLANS, formatPrice, intervalLabel, type Plan } from '../../lib/plans';
import { isDevModeEnabled } from '../../lib/auth-config';

const DEV_MODE = isDevModeEnabled();

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface PricingClientProps {
  signedIn: boolean;
  razorpayConfigured: boolean;
  currentPlanId: string | null;
  currentPeriodEnd: string | null;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; planId: string }
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string };

export default function PricingClient({
  signedIn,
  razorpayConfigured,
  currentPlanId,
  currentPeriodEnd,
}: PricingClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [scriptReady, setScriptReady] = useState(false);
  // Set when a payment succeeds in this session; otherwise the server's value wins.
  const [grantedPlanId, setGrantedPlanId] = useState<string | null>(null);
  const activePlanId = grantedPlanId ?? currentPlanId;

  const startCheckout = useCallback(
    async (plan: Plan) => {
      if (!signedIn) {
        router.push(`/login?next=${encodeURIComponent('/pricing')}`);
        return;
      }

      setStatus({ kind: 'busy', planId: plan.id });

      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const order = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok) {
        setStatus({
          kind: 'error',
          message: order.hint ? `${order.error} ${order.hint}` : order.error || 'Could not start checkout.',
        });
        return;
      }

      if (!window.Razorpay) {
        setStatus({ kind: 'error', message: 'Razorpay checkout could not load. Check your connection and retry.' });
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'CKR Decision Platform',
        description: `${plan.name} — ${intervalLabel(plan)}`,
        order_id: order.orderId,
        prefill: order.prefill,
        notes: { plan_id: plan.id },
        theme: { color: '#6F00FF' },
        modal: {
          ondismiss: () => setStatus({ kind: 'idle' }),
        },
        handler: async (response: RazorpayHandlerResponse) => {
          setStatus({ kind: 'busy', planId: plan.id });
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, planId: plan.id }),
          });
          const verify = await verifyRes.json().catch(() => ({}));

          if (!verifyRes.ok) {
            setStatus({
              kind: 'error',
              message: verify.error || 'We could not verify that payment. Contact support with your payment ID.',
            });
            return;
          }

          setGrantedPlanId(plan.id);
          setStatus({
            kind: 'success',
            message: verify.warning
              ? `Payment successful. ${verify.warning}`
              : `Payment successful — ${plan.name} is now active.`,
          });
          router.refresh();
        },
      });

      checkout.open();
    },
    [router, signedIn],
  );

  async function simulatePayment(plan: Plan) {
    setStatus({ kind: 'busy', planId: plan.id });
    const res = await fetch('/api/razorpay/dev-grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: plan.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus({ kind: 'error', message: data.error || 'Dev grant failed.' });
      return;
    }
    setGrantedPlanId(plan.id);
    setStatus({
      kind: 'success',
      message: `Dev mode: ${plan.name} marked active without a charge.${data.warning ? ` (${data.warning})` : ''}`,
    });
    router.refresh();
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />

      {!razorpayConfigured && (
        <div className="max-w-3xl mx-auto mb-10 rounded-xl border border-dashed border-[#E8E6F5] bg-[#F8F7FF] px-5 py-4">
          <p className="text-sm text-[#131628] mb-1">Razorpay is not connected yet.</p>
          <p className="text-xs text-[#7B7A9D] leading-relaxed">
            Add <code className="text-[#6F00FF]">RAZORPAY_KEY_ID</code> and{' '}
            <code className="text-[#6F00FF]">RAZORPAY_KEY_SECRET</code> to <code>.env.local</code> and
            restart the dev server. Checkout is wired end to end and will work the moment those land.
          </p>
        </div>
      )}

      {activePlanId && (
        <div className="max-w-3xl mx-auto mb-10 rounded-xl bg-emerald-50 px-5 py-4">
          <p className="text-sm text-emerald-800">
            Your <strong>{PLANS.find(p => p.id === activePlanId)?.name ?? activePlanId}</strong> plan is active
            {currentPeriodEnd && ` until ${new Date(currentPeriodEnd).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}.
          </p>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="max-w-3xl mx-auto mb-10 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700">
          {status.message}
        </div>
      )}
      {status.kind === 'success' && (
        <div className="max-w-3xl mx-auto mb-10 rounded-xl bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {status.message}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {PLANS.map(plan => {
          const busy = status.kind === 'busy' && status.planId === plan.id;
          const isCurrent = activePlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? 'border-[#6F00FF] shadow-[0_8px_40px_-12px_rgba(111,0,255,0.35)]'
                  : 'border-[#E8E6F5]'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-7 bg-[#6F00FF] text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              <h3 className="text-lg text-[#131628]">{plan.name}</h3>
              <p className="text-xs text-[#7B7A9D] mt-1.5 leading-relaxed min-h-[32px]">{plan.tagline}</p>

              <div className="flex items-baseline gap-1.5 mt-6">
                <span className="text-3xl text-[#131628] tracking-tight">{formatPrice(plan)}</span>
                <span className="text-xs text-[#9B9BC0]">{intervalLabel(plan)}</span>
              </div>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-[#4A4A6A]">
                    <svg className="w-4 h-4 text-[#6F00FF] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startCheckout(plan)}
                disabled={busy || isCurrent || (signedIn && razorpayConfigured && !scriptReady)}
                className={`mt-7 w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none ${
                  plan.highlight
                    ? 'bg-[#6F00FF] text-white hover:bg-[#5B00D4]'
                    : 'bg-[#131628] text-white hover:bg-[#1e2240]'
                }`}
              >
                {busy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isCurrent ? 'Current plan' : signedIn ? `Get ${plan.name}` : 'Sign in to subscribe'}
              </button>

              {DEV_MODE && (
                <button
                  onClick={() => simulatePayment(plan)}
                  disabled={busy}
                  className="mt-2.5 w-full py-2 text-xs text-[#B5B3D0] hover:text-[#7B7A9D] border border-dashed border-[#E8E6F5] hover:border-[#C9C6E8] rounded-lg transition-colors disabled:opacity-50"
                >
                  Skip payment (dev mode)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
