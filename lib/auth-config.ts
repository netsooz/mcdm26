/**
 * Shared auth/routing configuration. Imported by `proxy.ts` (edge runtime),
 * route handlers and client components — keep it free of Node-only APIs.
 */

/** Cookie set by the dev-mode skip button. Only honoured when dev mode is on. */
export const DEV_BYPASS_COOKIE = 'ckr_dev_bypass';

/** Cookie marking a dev-mode simulated plan. Only honoured when dev mode is on. */
export const DEV_PLAN_COOKIE = 'ckr_dev_plan';

/**
 * Dev mode is on in local development, or in any deployment that explicitly
 * opts in with NEXT_PUBLIC_DEV_MODE=true. Leave it unset in production.
 */
export function isDevModeEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  );
}

/** Routes anyone can open, signed in or not. Prefix match. */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/terms',
  '/privacy',
  '/auth',
  '/api/auth',
  '/api/dev-mode',
  '/api/razorpay/webhook',
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Where to send a user after they sign in with no explicit destination. */
export const DEFAULT_SIGNED_IN_REDIRECT = '/';
