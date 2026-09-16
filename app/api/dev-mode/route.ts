import { NextResponse } from 'next/server';
import { DEV_BYPASS_COOKIE, isDevModeEnabled } from '../../../lib/auth-config';

/**
 * Backs the "Skip sign-in (dev mode)" button. Sets a short-lived cookie that
 * `proxy.ts` accepts *only* while dev mode is enabled — i.e. in local
 * development, or when NEXT_PUBLIC_DEV_MODE=true is set deliberately.
 */
export async function POST() {
  if (!isDevModeEnabled()) {
    return NextResponse.json({ error: 'Dev mode is disabled.' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, devMode: true });
  response.cookies.set(DEV_BYPASS_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}

/** Turn the bypass back off. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true, devMode: false });
  response.cookies.delete(DEV_BYPASS_COOKIE);
  return response;
}
