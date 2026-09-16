import crypto from 'node:crypto';

/**
 * Thin Razorpay REST wrapper — no SDK dependency. Server-only: never import
 * this from a client component, it reads the key secret.
 *
 * Required env (see .env.example):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * Optional:
 *   RAZORPAY_WEBHOOK_SECRET  (for /api/razorpay/webhook)
 */

const API_BASE = 'https://api.razorpay.com/v1';

export function getRazorpayKeyId(): string | undefined {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
}

function getRazorpayKeySecret(): string | undefined {
  return process.env.RAZORPAY_KEY_SECRET;
}

/** True once both credentials are present. The UI degrades politely if not. */
export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

function authHeader(): string {
  const raw = `${getRazorpayKeyId()}:${getRazorpayKeySecret()}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
      payment_capture: 1,
    }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.description || `Razorpay order failed (${res.status})`;
    throw new Error(message);
  }
  return body as RazorpayOrder;
}

export async function fetchRazorpayPayment(paymentId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.description || `Razorpay payment lookup failed (${res.status})`);
  }
  return body as Record<string, unknown>;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Checkout handler signature: HMAC-SHA256("<order_id>|<payment_id>", secret). */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getRazorpayKeySecret();
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  return safeEqual(expected, params.signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
