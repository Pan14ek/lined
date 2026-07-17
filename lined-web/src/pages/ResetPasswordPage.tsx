import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { AuthAlert } from '@/components/AuthAlert';
import { useResetPassword } from '@/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.newPassword) {
    errors.newPassword = 'Password is required';
  } else if (values.newPassword.length < 8) {
    errors.newPassword = 'Password must be at least 8 characters';
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

function InvalidTokenCard() {
  return (
    <AuthCard heading="Reset your password" subheading="Set a new password for your account">
      <AuthAlert message="This reset link is invalid or has expired." />
      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link to="/forgot-password" className="font-medium text-brand-green hover:underline">
          Request a new reset link →
        </Link>
      </p>
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { newPassword: '', confirmPassword: '' },
    validate,
  );

  if (!token) {
    return <InvalidTokenCard />;
  }
  const resetToken = token;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    markAllTouched();
    if (hasErrors) return;

    resetPassword.mutate(
      { token: resetToken, newPassword: values.newPassword },
      { onSuccess: () => navigate('/sign-in?reset=success') },
    );
  }

  return (
    <AuthCard heading="Reset your password" subheading="Set a new password for your account">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <FormField
            id="reset-password-new"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(v) => set('newPassword', v)}
            onBlur={() => markTouched('newPassword')}
            placeholder="Create a strong password"
            error={touched.newPassword ? errors.newPassword : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="reset-password-confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(v) => set('confirmPassword', v)}
            onBlur={() => markTouched('confirmPassword')}
            placeholder="Re-enter your password"
            error={touched.confirmPassword ? errors.confirmPassword : null}
          />
        </div>

        {resetPassword.isError && (
          <AuthAlert message="This reset link is invalid or has expired." />
        )}

        <button
          type="submit"
          disabled={resetPassword.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
        </button>

        {resetPassword.isError && (
          <p className="mt-6 text-center text-sm text-text-secondary">
            <Link to="/forgot-password" className="font-medium text-brand-green hover:underline">
              Request a new reset link →
            </Link>
          </p>
        )}
      </form>
    </AuthCard>
  );
}
