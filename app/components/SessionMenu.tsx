'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import UserMenu from './UserMenu';

/**
 * Self-contained account menu for client-rendered screens (the tool headers),
 * which can't receive the user from a server component.
 */
export default function SessionMenu({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <div className="h-8" />;
  return <UserMenu email={email} tone={tone} />;
}
