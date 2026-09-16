'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { Alert, Field } from './AuthForm';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-2xl text-[#131628] tracking-tight mb-1.5">Reset your password</h1>
      <p className="text-sm text-[#7B7A9D] mb-7">
        We&apos;ll email you a link to choose a new one.
      </p>

      {sent ? (
        <Alert tone="success">
          If an account exists for {email.trim()}, a reset link is on its way. Check your inbox and spam folder.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
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
          {error && <Alert tone="error">{error}</Alert>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#6F00FF] text-white hover:bg-[#5B00D4] px-5 py-3 text-sm rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Send reset link
          </button>
        </form>
      )}

      <p className="text-sm text-[#7B7A9D] text-center mt-6">
        <a href="/login" className="text-[#6F00FF] hover:text-[#5B00D4] transition-colors">Back to sign in</a>
      </p>
    </div>
  );
}
