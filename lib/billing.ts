import { getSupabaseAdminClient, getSupabaseServerClient } from './supabase/server';
import { getPlan, periodEndFrom } from './plans';

export interface Subscription {
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  updated_at: string;
}

/** Active subscription for the signed-in user, or null. */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id, status, current_period_end, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  const sub = data as Subscription;
  if (sub.status !== 'active') return null;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return null;
  return sub;
}

/**
 * Records a captured payment and grants the plan. Uses the service-role client
 * so the write bypasses RLS; if SUPABASE_SERVICE_ROLE_KEY is not set the
 * payment is still verified, we just can't persist it.
 */
export async function grantPlanAfterPayment(params: {
  userId: string;
  email: string | null;
  planId: string;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
}): Promise<{ persisted: boolean; reason?: string }> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { persisted: false, reason: 'SUPABASE_SERVICE_ROLE_KEY is not configured' };
  }

  const plan = getPlan(params.planId);
  const now = new Date();
  const periodEnd = plan ? periodEndFrom(now, plan.interval) : null;

  const { error: paymentError } = await admin.from('payments').upsert(
    {
      user_id: params.userId,
      email: params.email,
      plan_id: params.planId,
      razorpay_order_id: params.orderId,
      razorpay_payment_id: params.paymentId,
      amount: params.amountPaise,
      currency: params.currency,
      status: 'captured',
      updated_at: now.toISOString(),
    },
    { onConflict: 'razorpay_order_id' },
  );

  if (paymentError) return { persisted: false, reason: paymentError.message };

  const { error: subError } = await admin.from('subscriptions').upsert(
    {
      user_id: params.userId,
      plan_id: params.planId,
      status: 'active',
      current_period_end: periodEnd ? periodEnd.toISOString() : null,
      latest_payment_id: params.paymentId,
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (subError) return { persisted: false, reason: subError.message };
  return { persisted: true };
}

/** Records the order the moment it is created, so unpaid attempts are visible. */
export async function recordPendingOrder(params: {
  userId: string;
  email: string | null;
  planId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
}): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  await admin.from('payments').upsert(
    {
      user_id: params.userId,
      email: params.email,
      plan_id: params.planId,
      razorpay_order_id: params.orderId,
      amount: params.amountPaise,
      currency: params.currency,
      status: 'created',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'razorpay_order_id' },
  );
}
