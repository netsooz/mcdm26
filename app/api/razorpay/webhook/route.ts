import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhookSignature } from '../../../../lib/razorpay';
import { grantPlanAfterPayment } from '../../../../lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook — the reliable path when the browser closes before the
 * checkout handler runs. Configure it in the Razorpay dashboard against
 * `payment.captured` and set RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const notes = (payment?.notes ?? {}) as Record<string, string>;
  const userId = notes.user_id;
  const planId = notes.plan_id;
  const orderId = payment?.order_id as string | undefined;
  const paymentId = payment?.id as string | undefined;

  if (!userId || !planId || !orderId || !paymentId) {
    return NextResponse.json({ ok: true, ignored: 'missing notes' });
  }

  const result = await grantPlanAfterPayment({
    userId,
    email: (notes.email as string) || null,
    planId,
    orderId,
    paymentId,
    amountPaise: Number(payment?.amount ?? 0),
    currency: String(payment?.currency ?? 'INR'),
  });

  return NextResponse.json({ ok: true, persisted: result.persisted });
}
