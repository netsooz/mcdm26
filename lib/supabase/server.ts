import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Request-scoped Supabase client for server components, route handlers and
 * server actions. `cookies()` is async in Next 16, so this is too — never
 * cache the returned client across requests.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — the proxy refreshes the
            // session instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** The signed-in user, or null. Uses getUser() so the token is verified. */
export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Service-role client for trusted server-side writes (payment records).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured so callers can
 * degrade gracefully instead of crashing. Never import this from client code.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
