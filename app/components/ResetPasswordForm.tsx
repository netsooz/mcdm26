'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { Alert, Field } from './AuthForm';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 1500);
  }

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-2xl text-[#131628] tracking-tight mb-1.5">Choose a new password</h1>
      <p className="text-sm text-[#7B7A9D] mb-7">
        Open this page from the link we emailed you, then set your new password.
      </p>

      {done ? (
        <Alert tone="success">Password updated. Taking you to your tools…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="New password" required>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              className="gate-input"
            />
          </Field>
          <Field label="Confirm password" required>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
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
            Update password
          </button>
        </form>
      )}
    </div>
  );
}
