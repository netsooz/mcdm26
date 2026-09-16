import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AuthForm from '../components/AuthForm';
import AuthShell from '../components/AuthShell';
import { getCurrentUser } from '../../lib/supabase/server';

export const metadata = {
  title: 'Sign in - CKR Decision Platform',
  description: 'Sign in to access the CKR multi-criteria decision analysis tools.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    const next = typeof sp.next === 'string' && sp.next.startsWith('/') ? sp.next : '/';
    redirect(next);
  }

  return (
    <AuthShell>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
