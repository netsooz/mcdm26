'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { DEFAULT_SIGNED_IN_REDIRECT, isDevModeEnabled } from '../../lib/auth-config';

type Mode = 'login' | 'signup';

const DEV_MODE = isDevModeEnabled();

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || DEFAULT_SIGNED_IN_REDIRECT;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSignup = mode === 'signup';
  const supabase = getSupabaseBrowserClient();

  function safeNext() {
    // Only allow same-origin relative paths — never an attacker-supplied URL.
    return next.startsWith('/') && !next.startsWith('//') ? next : DEFAULT_SIGNED_IN_REDIRECT;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (isSignup && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}`,
        },
      });
      setBusy(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!data.session) {
        // Email confirmation is enabled on the Supabase project.
        setNotice(`We sent a confirmation link to ${email.trim()}. Open it to activate your account.`);
        return;
      }
      router.push(safeNext());
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(safeNext());
    router.refresh();
  }

  async function handleGoogle() {
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}`,
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function handleDevSkip() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/dev-mode', { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      setError('Dev mode is disabled on this deployment.');
      return;
    }
    router.push(safeNext());
    router.refresh();
  }

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-2xl text-[#131628] tracking-tight mb-1.5">
        {isSignup ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="text-sm text-[#7B7A9D] mb-7">
        {isSignup
          ? 'Free access to every decision tool. No card required.'
          : 'Sign in to continue to your decision tools.'}
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 bg-white border border-[#E8E6F5] hover:border-[#C9C6E8] hover:bg-[#F8F7FF] px-5 py-3 rounded-xl text-sm text-[#131628] transition-all active:scale-[0.99]"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-[#E8E6F5]" />
        <span className="text-[11px] uppercase tracking-widest text-[#B5B3D0]">or</span>
        <div className="h-px flex-1 bg-[#E8E6F5]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isSignup && (
          <Field label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              className="gate-input"
            />
          </Field>
        )}

        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
            className="gate-input"
          />
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              className="gate-input pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-[#B5B3D0] hover:text-[#6F00FF] transition-colors"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        {!isSignup && (
          <div className="flex justify-end">
            <a href="/forgot-password" className="text-xs text-[#7B7A9D] hover:text-[#6F00FF] transition-colors">
              Forgot password?
            </a>
          </div>
        )}

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#6F00FF] text-white hover:bg-[#5B00D4] px-5 py-3 text-sm rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          {busy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-[#7B7A9D] text-center mt-6">
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <a
          href={`${isSignup ? '/login' : '/signup'}?next=${encodeURIComponent(safeNext())}`}
          className="text-[#6F00FF] hover:text-[#5B00D4] transition-colors"
        >
          {isSignup ? 'Sign in' : 'Sign up free'}
        </a>
      </p>

      <p className="text-[11px] text-[#B5B3D0] text-center mt-4 leading-relaxed">
        By continuing you agree to our{' '}
        <a href="/terms" className="underline hover:text-[#7B7A9D] transition-colors">Terms</a> and{' '}
        <a href="/privacy" className="underline hover:text-[#7B7A9D] transition-colors">Privacy Policy</a>.
      </p>

      {DEV_MODE && (
        <button
          type="button"
          onClick={handleDevSkip}
          disabled={busy}
          className="w-full mt-6 py-2.5 text-xs text-[#B5B3D0] hover:text-[#7B7A9D] border border-dashed border-[#E8E6F5] hover:border-[#C9C6E8] rounded-lg transition-colors disabled:opacity-50"
        >
          Skip sign-in (dev mode)
        </button>
      )}
    </div>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-[#9B9BC0] uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Alert({ tone, children }: { tone: 'error' | 'info' | 'success'; children: React.ReactNode }) {
  const styles = {
    error: 'bg-red-50 text-red-600',
    info: 'bg-[#F1EDFF] text-[#5B00D4]',
    success: 'bg-emerald-50 text-emerald-700',
  }[tone];
  return <div className={`flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed ${styles}`}>{children}</div>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
