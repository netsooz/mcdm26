// Kept for backwards compatibility with existing imports.
// The client now stores its session in cookies so the server can read it.
export { getSupabaseBrowserClient } from './supabase/client';
import { getSupabaseBrowserClient } from './supabase/client';

export const supabase = new Proxy({} as ReturnType<typeof getSupabaseBrowserClient>, {
  get(_target, prop) {
    const client = getSupabaseBrowserClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
