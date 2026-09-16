# Auth & Payments Setup

Everything below is already wired in code. These are the credentials and
dashboard settings needed to switch it on.

## 1. Supabase

1. **Run the schema.** Dashboard → SQL Editor → paste [`supabase/schema.sql`](supabase/schema.sql) → Run.
   It creates `profiles`, `payments` and `subscriptions` with row-level security.
2. **Email/password login.** Authentication → Providers → Email → enabled (on by default).
   Turn "Confirm email" on or off to taste — the signup form handles both.
3. **Google login.** Authentication → Providers → Google → add your Google OAuth
   client ID/secret. In the Google Cloud console, add this authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. **Redirect URLs.** Authentication → URL Configuration → Site URL
   `http://localhost:3000` (and your production URL), plus these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-domain>/auth/callback`
5. **Service-role key.** Project Settings → API → copy `service_role` into
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Payments cannot be recorded without it.
   Never expose this key to the browser.

## 2. Razorpay

1. Dashboard → Account & Settings → API Keys → **Generate Test Key**.
2. Put them in `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
   ```
3. Restart `npm run dev`. The "Razorpay is not connected yet" banner on
   `/pricing` disappears and checkout goes live.
4. **Webhook (recommended).** Dashboard → Settings → Webhooks → add
   `https://<your-domain>/api/razorpay/webhook`, subscribe to `payment.captured`,
   set a secret, and copy it into `RAZORPAY_WEBHOOK_SECRET`. This is what grants
   the plan if the user closes the browser before the checkout handler runs.
5. Test cards: card `4111 1111 1111 1111`, any future expiry, any CVV; or use the
   test UPI id `success@razorpay`.

Plans and prices live in [`lib/plans.ts`](lib/plans.ts) — amounts are in **paise**
(`199900` = ₹1,999). The server always prices the order from that file, so a
tampered browser request cannot buy a plan cheaply.

## 3. Dev mode

`NEXT_PUBLIC_DEV_MODE` (or any non-production `NODE_ENV`) turns on two escape hatches:

- **Skip sign-in (dev mode)** on `/login` — sets a short-lived `ckr_dev_bypass`
  cookie that `proxy.ts` accepts, so the tools open with no account.
- **Skip payment (dev mode)** on `/pricing` — marks a plan active without charging.

Both are refused with a 403 when dev mode is off. **Leave `NEXT_PUBLIC_DEV_MODE`
unset in production** — setting it to `true` there removes the login wall for
anyone who knows the button exists.

## 4. What's protected

`proxy.ts` (Next 16's renamed Middleware) redirects signed-out visitors to
`/login?next=<path>`. Public routes: `/`, `/login`, `/signup`, `/forgot-password`,
`/reset-password`, `/pricing`, `/terms`, `/privacy`, `/auth/*`, and the Razorpay
webhook. Everything else — all 11 tools — requires a session.
