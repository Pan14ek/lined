import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HTTPError } from 'ky';
import { AuthCard } from '@/components/AuthCard';
import { AuthField } from '@/components/AuthField';
import { AuthAlert } from '@/components/AuthAlert';
import { useSignIn } from '@/hooks/useAuth';
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
  const signIn = useSignIn();
  const setUserId = useAuthStore((s) => s.setUserId);
  const setToken = useAuthStore((s) => s.setToken);

  const [values, setValues] = useState<FormValues>({ identifier: '', password: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});

  const errors = validate(values);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function markTouched(key: keyof FormValues) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    if (Object.keys(errors).length > 0) return;

    signIn.mutate(values, {
      onSuccess: (res) => {
        setUserId(res.userId);
        setToken(res.accessToken);
        navigate('/');
      },
    });
  }

  const serverError = getServerErrorMessage(signIn.error);

  return (
    <AuthCard heading="Welcome back" subheading="Sign in to your Lined account">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <AuthField
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
          <AuthField
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
          <div className="mt-1.5 text-xs text-text-secondary">Forgot password?</div>
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
