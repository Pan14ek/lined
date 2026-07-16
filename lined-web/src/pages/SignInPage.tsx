import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HTTPError } from 'ky';
import { AuthCard } from '@/components/AuthCard';
import { useSignIn } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';

export function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSignIn();
  const setUserId = useAuthStore((s) => s.setUserId);
  const setToken = useAuthStore((s) => s.setToken);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signIn.mutate(
      { identifier, password },
      {
        onSuccess: (res) => {
          setUserId(res.userId);
          setToken(res.accessToken);
          navigate('/');
        },
      },
    );
  }

  const errorMessage = getErrorMessage(signIn.error);

  return (
    <AuthCard heading="Welcome back" subheading="Sign in to your Lined account">
      <form onSubmit={handleSubmit}>
        <div className="mt-5">
          <label
            htmlFor="signin-email"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Email address
          </label>
          <input
            id="signin-email"
            type="email"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="alex@example.com"
            className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
          />
        </div>
        <div className="mt-5">
          <label
            htmlFor="signin-password"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
          />
          <div className="mt-1.5 text-xs text-text-secondary">Forgot password?</div>
        </div>

        {errorMessage && (
          <p className="mt-3 text-xs font-medium text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

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

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HTTPError && error.response.status === 401) {
    return 'Invalid credentials';
  }
  return 'Something went wrong — please try again';
}
