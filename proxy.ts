import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { DEV_BYPASS_COOKIE, isDevModeEnabled, isPublicRoute } from './lib/auth-config';

/**
 * Next 16 renamed Middleware to Proxy. This runs before every matched request:
 * it refreshes the Supabase session cookies and redirects signed-out visitors
 * away from the tools.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Always refresh the session, even on public routes, so tokens stay alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user || isPublicRoute(pathname)) return response;

  // Dev-mode skip: only trusted when dev mode is explicitly enabled.
  if (isDevModeEnabled() && request.cookies.get(DEV_BYPASS_COOKIE)?.value === '1') {
    return response;
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the favicon and static files —
     * those never need a session check.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
