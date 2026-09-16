import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabase/server';
import { getPlan } from '../../../../lib/plans';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from '../../../../lib/razorpay';
import { recordPendingOrder } from '../../../../lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Creates a Razorpay order for the signed-in user and the requested plan. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You need to be signed in to pay.' }, { status: 401 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      {
        error: 'Payments are not configured yet.',
        code: 'razorpay_not_configured',
        hint: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local, then restart the dev server.',
      },
      { status: 503 },
    );
  }

  let planId: unknown;
  try {
    ({ planId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // The amount always comes from the server-side plan table — never from the
  // client — so a tampered request can't buy a plan for ₹1.
  const plan = typeof planId === 'string' ? getPlan(planId) : undefined;
  if (!plan) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  try {
    const order = await createRazorpayOrder({
      amountPaise: plan.amountPaise,
      currency: plan.currency,
      receipt: `ckr_${plan.id}_${Date.now()}`.slice(0, 40),
      notes: { user_id: user.id, plan_id: plan.id, email: user.email ?? '' },
    });

    await recordPendingOrder({
      userId: user.id,
      email: user.email ?? null,
      planId: plan.id,
      orderId: order.id,
      amountPaise: plan.amountPaise,
      currency: plan.currency,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      planName: plan.name,
      prefill: {
        name: (user.user_metadata?.full_name as string | undefined) ?? '',
        email: user.email ?? '',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the order.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
