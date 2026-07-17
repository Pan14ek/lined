import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HTTPError } from 'ky';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { AuthAlert } from '@/components/AuthAlert';
import { useSignIn } from '@/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';
import { useAuthStore } from '@/store/auth';

interface FormValues {
  identifier: string;
  password: string;
}

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.identifier.trim()) errors.identifier = 'Email or username is required';
  if (!values.password) errors.password = 'Password is required';
  return errors;
}

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useSignIn();
  const setUserId = useAuthStore((s) => s.setUserId);
  const resetSucceeded = searchParams.get('reset') === 'success';

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { identifier: '', password: '' },
    validate,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    markAllTouched();
    if (hasErrors) return;

    signIn.mutate(values, {
      onSuccess: (res) => {
        setUserId(res.userId);
        navigate('/');
      },
    });
  }

  const serverError = getServerErrorMessage(signIn.error);

  return (
    <AuthCard heading="Welcome back" subheading="Sign in to your Lined account">
      {resetSucceeded && (
        <AuthAlert variant="success" message="Password reset — sign in with your new password." />
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <FormField
            id="signin-email"
            label="Email address"
            type="email"
            autoComplete="username"
            value={values.identifier}
            onChange={(v) => set('identifier', v)}
            onBlur={() => markTouched('identifier')}
            placeholder="alex@example.com"
            error={touched.identifier ? errors.identifier : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signin-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(v) => set('password', v)}
            onBlur={() => markTouched('password')}
            placeholder="••••••••"
            error={touched.password ? errors.password : null}
          />
          <div className="mt-1.5 text-xs">
            <Link to="/forgot-password" className="font-medium text-brand-green hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        {serverError && <AuthAlert message={serverError} />}

        <button
          type="submit"
          disabled={signIn.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {signIn.isPending ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          New to Lined?{' '}
          <Link to="/sign-up" className="font-medium text-brand-green hover:underline">
            Create an account →
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

function getServerErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HTTPError && error.response.status === 401) {
    return 'Invalid credentials';
  }
  return 'Something went wrong — please try again';
}
