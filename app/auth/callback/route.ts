import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../../../lib/supabase/server';

/**
 * OAuth + email-link landing route. Exchanges the code (or token hash) for a
 * session and writes the auth cookies before redirecting onwards.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  // Resolve the true public origin behind reverse proxies like Render
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

  const origin =
    process.env.NODE_ENV === 'development'
      ? requestUrl.origin
      : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : 'https://mcdm-kjju.onrender.com';

  const supabase = await getSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
      );
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}