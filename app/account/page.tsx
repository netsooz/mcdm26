import Link from 'next/link';
import { redirect } from 'next/navigation';
import UserMenu from '../components/UserMenu';
import { getCurrentUser } from '../../lib/supabase/server';
import { getActiveSubscription } from '../../lib/billing';
import { PLANS } from '../../lib/plans';

export const metadata = { title: 'Account - CKR Decision Platform' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  const subscription = await getActiveSubscription(user.id);
  const plan = subscription ? PLANS.find(p => p.id === subscription.plan_id) : null;

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8E6F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-[#131628] tracking-tight hover:text-[#6F00FF] transition-colors">CKR</Link>
          <UserMenu email={user.email ?? null} planId={subscription?.plan_id ?? null} />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 lg:px-8 pt-28 pb-24">
        <h1 className="text-2xl text-[#131628] tracking-tight mb-8">Account</h1>

        <section className="rounded-2xl border border-[#E8E6F5] p-7 mb-6">
          <h2 className="text-[11px] uppercase tracking-widest text-[#9B9BC0] mb-4">Profile</h2>
          <Row label="Email" value={user.email ?? '—'} />
          <Row label="Name" value={(user.user_metadata?.full_name as string) || '—'} />
          <Row label="Signed up" value={new Date(user.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} />
        </section>

        <section className="rounded-2xl border border-[#E8E6F5] p-7">
          <h2 className="text-[11px] uppercase tracking-widest text-[#9B9BC0] mb-4">Plan</h2>
          <Row label="Current plan" value={plan?.name ?? 'Free'} />
          {subscription?.current_period_end && (
            <Row
              label="Renews / expires"
              value={new Date(subscription.current_period_end).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            />
          )}
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 mt-5 bg-[#6F00FF] text-white hover:bg-[#5B00D4] px-5 py-2.5 text-sm rounded-xl transition-all active:scale-[0.99]"
          >
            {plan ? 'Change plan' : 'Upgrade'}
          </a>
        </section>

        <form action="/auth/signout" method="post" className="mt-8">
          <button type="submit" className="text-sm text-red-600 hover:text-red-700 transition-colors">
            Sign out
          </button>
        </form>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-[#F1EFFA] last:border-0">
      <span className="text-xs text-[#9B9BC0]">{label}</span>
      <span className="text-sm text-[#131628]">{value}</span>
    </div>
  );
}
