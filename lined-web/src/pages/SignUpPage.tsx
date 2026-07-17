import { Link, useNavigate } from 'react-router-dom';
import { HTTPError } from 'ky';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { AuthAlert } from '@/components/AuthAlert';
import { useSignUp } from '@/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';
import { useAuthStore } from '@/store/auth';

interface FormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.username.trim()) errors.username = 'Username is required';
  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(values.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useSignUp();
  const setUserId = useAuthStore((s) => s.setUserId);

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { username: '', email: '', password: '', confirmPassword: '' },
    validate,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    markAllTouched();
    if (hasErrors) return;

    signUp.mutate(
      { username: values.username, email: values.email, password: values.password },
      {
        onSuccess: (user) => {
          setUserId(user.id);
          navigate('/');
        },
      },
    );
  }

  const serverError = getServerErrorMessage(signUp.error);

  return (
    <AuthCard heading="Create your account" subheading="Join Lined and start coordinating together">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <FormField
            id="signup-username"
            label="Username"
            type="text"
            autoComplete="username"
            value={values.username}
            onChange={(v) => set('username', v)}
            onBlur={() => markTouched('username')}
            placeholder="alex_johnson"
            error={touched.username ? errors.username : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signup-email"
            label="Email address"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(v) => set('email', v)}
            onBlur={() => markTouched('email')}
            placeholder="alex@example.com"
            error={touched.email ? errors.email : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(v) => set('password', v)}
            onBlur={() => markTouched('password')}
            placeholder="Create a strong password"
            error={touched.password ? errors.password : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signup-confirm-password"
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

        <p className="mt-4 text-xs text-text-muted">
          By creating an account you agree to our Terms &amp; Privacy Policy
        </p>

        {serverError && <AuthAlert message={serverError} />}

        <button
          type="submit"
          disabled={signUp.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {signUp.isPending ? 'Creating…' : 'Create account'}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-brand-green hover:underline">
            Sign in →
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

function getServerErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HTTPError && error.response.status === 409) {
    return 'Username or email already taken';
  }
  return 'Something went wrong — please try again';
}
