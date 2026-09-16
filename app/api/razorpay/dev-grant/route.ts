import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabase/server';
import { getPlan } from '../../../../lib/plans';
import { grantPlanAfterPayment } from '../../../../lib/billing';
import { DEV_PLAN_COOKIE, isDevModeEnabled } from '../../../../lib/auth-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dev-mode escape hatch for the checkout flow: marks the plan as active
 * without charging anything, so the rest of the app can be exercised before
 * the Razorpay credentials arrive. Refuses unless dev mode is enabled.
 */
export async function POST(request: NextRequest) {
  if (!isDevModeEnabled()) {
    return NextResponse.json({ error: 'Dev mode is disabled.' }, { status: 403 });
  }

  let planId: unknown;
  try {
    ({ planId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const plan = typeof planId === 'string' ? getPlan(planId) : undefined;
  if (!plan) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  let persisted = false;
  let reason: string | undefined;

  if (user) {
    const result = await grantPlanAfterPayment({
      userId: user.id,
      email: user.email ?? null,
      planId: plan.id,
      orderId: `dev_order_${Date.now()}`,
      paymentId: `dev_pay_${Date.now()}`,
      amountPaise: 0,
      currency: plan.currency,
    });
    persisted = result.persisted;
    reason = result.reason;
  }

  // Cookie fallback so the UI still reflects the plan when there is no user
  // (dev sign-in bypass) or no service-role key to write with.
  const response = NextResponse.json({
    ok: true,
    simulated: true,
    planId: plan.id,
    persisted,
    warning: persisted ? undefined : reason ?? 'Simulated locally with a cookie.',
  });
  response.cookies.set(DEV_PLAN_COOKIE, plan.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
