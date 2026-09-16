'use client';

import { useEffect, useRef, useState } from 'react';

interface UserMenuProps {
  email: string | null;
  planId?: string | null;
  /** 'light' for white navs, 'dark' for the navy tool headers. */
  tone?: 'light' | 'dark';
}

export default function UserMenu({ email, planId, tone = 'light' }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const linkClass =
    tone === 'dark'
      ? 'text-xs text-white/40 hover:text-white transition-colors uppercase tracking-wider'
      : 'text-xs text-[#9B9BC0] hover:text-[#131628] transition-colors uppercase tracking-wider';

  if (!email) {
    return (
      <div className="flex items-center gap-5">
        <a href="/pricing" className={linkClass}>Pricing</a>
        <a href="/login" className={linkClass}>Sign in</a>
        <a
          href="/signup"
          className="text-xs bg-[#6F00FF] text-white hover:bg-[#5B00D4] px-3.5 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
        >
          Sign up
        </a>
      </div>
    );
  }

  const initial = email[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex items-center gap-5">
      <a href="/pricing" className={linkClass}>Pricing</a>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all active:scale-95 ${
            tone === 'dark' ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-[#131628] text-white hover:bg-[#1e2240]'
          }`}
          aria-label="Account menu"
        >
          {initial}
        </button>

        {open && (
          <div className="absolute right-0 top-10 w-60 bg-white rounded-xl shadow-xl border border-[#E8E6F5] overflow-hidden z-50 animate-fade-in-fast">
            <div className="px-4 py-3 border-b border-[#F1EFFA]">
              <p className="text-xs text-[#131628] truncate">{email}</p>
              <p className="text-[11px] text-[#9B9BC0] mt-0.5">
                {planId ? `${planId} plan` : 'Free plan'}
              </p>
            </div>
            <a href="/account" className="block px-4 py-2.5 text-xs text-[#4A4A6A] hover:bg-[#F8F7FF] transition-colors">
              Account
            </a>
            <a href="/pricing" className="block px-4 py-2.5 text-xs text-[#4A4A6A] hover:bg-[#F8F7FF] transition-colors">
              Plans & billing
            </a>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
