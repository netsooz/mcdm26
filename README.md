# CKR Decision Platform

This project delivers a marketing landing page plus a suite of multi-criteria decision-making tools. It is built with Next.js 16, Supabase auth/session handling, and Razorpay checkout support.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production build

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

## Render deployment

This repository includes a Render service definition in `render.yaml`.

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (recommended for webhook verification)

See `.env.example` for the full list and placeholder values.

Important production notes:
- Leave `NEXT_PUBLIC_DEV_MODE` unset in production.
- The app expects a public HTTPS URL for Supabase auth redirect and Razorpay webhook callbacks.
- Render will inject the required `$PORT` automatically; the `startCommand` in `render.yaml` binds to it.

## Project notes

- `proxy.ts` protects the internal tools with a Supabase session check.
- `next.config.ts` enables a standalone production output for deployment compatibility.
- The app builds successfully via `npm run build` when the required environment variables are available.
