import Link from 'next/link';
import { cookies } from 'next/headers';
import PricingClient from '../components/PricingClient';
import UserMenu from '../components/UserMenu';
import { getCurrentUser } from '../../lib/supabase/server';
import { getActiveSubscription } from '../../lib/billing';
import { isRazorpayConfigured } from '../../lib/razorpay';
import { DEV_PLAN_COOKIE, isDevModeEnabled } from '../../lib/auth-config';

export const metadata = {
  title: 'Pricing & Payments - CKR Decision Platform',
  description:
    'Simple plans for the CKR multi-criteria decision platform. Pay securely with Razorpay — UPI, cards, netbanking and wallets.',
};

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const user = await getCurrentUser();
  const subscription = user ? await getActiveSubscription(user.id) : null;

  let currentPlanId = subscription?.plan_id ?? null;
  if (!currentPlanId && isDevModeEnabled()) {
    const cookieStore = await cookies();
    currentPlanId = cookieStore.get(DEV_PLAN_COOKIE)?.value ?? null;
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8E6F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-[#131628] tracking-tight hover:text-[#6F00FF] transition-colors">
            CKR
          </Link>
          <UserMenu email={user?.email ?? null} planId={currentPlanId} />
        </div>
      </nav>

      <header className="pt-28 pb-14 px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 border border-[#6F00FF]/30 bg-[#6F00FF]/10 rounded-full px-3.5 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6F00FF]" />
          <span className="text-[11px] text-[#6F00FF]/80 uppercase tracking-widest">Pricing</span>
        </div>
        <h1 className="text-3xl lg:text-4xl text-[#131628] tracking-tight">Plans that scale with your decisions</h1>
        <p className="text-sm text-[#7B7A9D] mt-4 max-w-xl mx-auto leading-relaxed">
          Every plan unlocks all 11 tools and all 50+ MCDM methods. Pay with UPI, cards,
          netbanking or wallets — securely handled by Razorpay. GST invoice on request.
        </p>
      </header>

      <main className="px-6 lg:px-8 pb-24">
        <PricingClient
          signedIn={Boolean(user)}
          razorpayConfigured={isRazorpayConfigured()}
          currentPlanId={currentPlanId}
          currentPeriodEnd={subscription?.current_period_end ?? null}
        />

        <section className="max-w-3xl mx-auto mt-20">
          <h2 className="text-lg text-[#131628] mb-6">Questions</h2>
          <dl className="space-y-6">
            {[
              {
                q: 'Is my payment secure?',
                a: 'Payments are processed entirely by Razorpay. Card and UPI details never touch our servers — we only ever see a payment ID, which we verify cryptographically before granting access.',
              },
              {
                q: 'Can I cancel?',
                a: 'Plans are prepaid for the period you choose and simply lapse at the end of it. Nothing auto-renews without your action.',
              },
              {
                q: 'Do you invoice with GST?',
                a: 'Yes — email us the payment ID and your GSTIN and we will send a tax invoice.',
              },
              {
                q: 'What happens to my analyses?',
                a: 'Analyses are computed in your browser and stored locally. Reports you export are yours to keep regardless of plan status.',
              },
            ].map(item => (
              <div key={item.q} className="border-b border-[#E8E6F5] pb-6">
                <dt className="text-sm text-[#131628] mb-2">{item.q}</dt>
                <dd className="text-sm text-[#7B7A9D] leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
