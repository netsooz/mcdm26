import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabase/server';
import { getPlan } from '../../../../lib/plans';
import { verifyPaymentSignature } from '../../../../lib/razorpay';
import { grantPlanAfterPayment } from '../../../../lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called by the checkout handler. Verifies the Razorpay signature server-side
 * before anything is granted — the browser's word is never enough.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You need to be signed in.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const orderId = String(body.razorpay_order_id ?? '');
  const paymentId = String(body.razorpay_payment_id ?? '');
  const signature = String(body.razorpay_signature ?? '');
  const planId = String(body.planId ?? '');

  if (!orderId || !paymentId || !signature || !planId) {
    return NextResponse.json({ error: 'Missing payment fields.' }, { status: 400 });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
  }

  const result = await grantPlanAfterPayment({
    userId: user.id,
    email: user.email ?? null,
    planId: plan.id,
    orderId,
    paymentId,
    amountPaise: plan.amountPaise,
    currency: plan.currency,
  });

  return NextResponse.json({
    ok: true,
    planId: plan.id,
    persisted: result.persisted,
    warning: result.persisted ? undefined : `Payment verified but not recorded: ${result.reason}`,
  });
}
