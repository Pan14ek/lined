import { Link } from 'react-router-dom';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { useRequestPasswordReset } from '@/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';

interface FormValues {
  identifier: string;
}

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.identifier.trim()) errors.identifier = 'Email or username is required';
  return errors;
}

export function ForgotPasswordPage() {
  const requestReset = useRequestPasswordReset();

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { identifier: '' },
    validate,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    markAllTouched();
    if (hasErrors) return;

    requestReset.mutate(values);
  }

  // Always shown once a submission has settled, whether it succeeded or
  // failed — the identifier's existence must never be observable.
  const submitted = requestReset.isSuccess || requestReset.isError;

  if (submitted) {
    return (
      <AuthCard heading="Check your email" subheading="If an account exists for that email or username">
        <p className="mt-5 text-sm text-text-secondary">
          If an account exists for that email or username, we&apos;ve sent a link to reset your
          password.
        </p>
        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link to="/sign-in" className="font-medium text-brand-green hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard heading="Forgot your password?" subheading="Enter your email or username and we'll send you a reset link">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <FormField
            id="forgot-password-identifier"
            label="Email or username"
            type="text"
            autoComplete="username"
            value={values.identifier}
            onChange={(v) => set('identifier', v)}
            onBlur={() => markTouched('identifier')}
            placeholder="alex@example.com"
            error={touched.identifier ? errors.identifier : null}
          />
        </div>

        <button
          type="submit"
          disabled={requestReset.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {requestReset.isPending ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link to="/sign-in" className="font-medium text-brand-green hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
