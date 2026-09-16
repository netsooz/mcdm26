import AuthShell from '../components/AuthShell';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

export const metadata = { title: 'Reset password - CKR Decision Platform' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
