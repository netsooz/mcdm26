import LandingPage from './components/LandingPage';
import { getCurrentUser } from '../lib/supabase/server';
import { getActiveSubscription } from '../lib/billing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();
  const subscription = user ? await getActiveSubscription(user.id) : null;
  return <LandingPage userEmail={user?.email ?? null} planId={subscription?.plan_id ?? null} />;
}
