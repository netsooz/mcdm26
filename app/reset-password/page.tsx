import AuthShell from '../components/AuthShell';
import ResetPasswordForm from '../components/ResetPasswordForm';

export const metadata = { title: 'New password - CKR Decision Platform' };

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
