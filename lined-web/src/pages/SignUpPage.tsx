import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HTTPError } from 'ky';
import { AuthCard } from '@/components/AuthCard';
import { useSignUp } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';

export function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useSignUp();
  const setUserId = useAuthStore((s) => s.setUserId);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signUp.mutate(
      { username, email, password },
      {
        onSuccess: (user) => {
          setUserId(user.id);
          navigate('/');
        },
      },
    );
  }

  const errorMessage = getErrorMessage(signUp.error);

  return (
    <AuthCard heading="Create your account" subheading="Join Lined and start coordinating together">
      <form onSubmit={handleSubmit}>
        <div className="mt-5">
          <label
            htmlFor="signup-username"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Username
          </label>
          <input
            id="signup-username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="alex_johnson"
            className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
          />
        </div>
        <div className="mt-5">
          <label
            htmlFor="signup-email"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
          />
        </div>
        <div className="mt-5">
          <label
            htmlFor="signup-password"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
          />
        </div>

        <p className="mt-4 text-xs text-text-muted">
          By creating an account you agree to our Terms &amp; Privacy Policy
        </p>

        {errorMessage && (
          <p className="mt-3 text-xs font-medium text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

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

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HTTPError && error.response.status === 409) {
    return 'Username or email already taken';
  }
  return 'Something went wrong — please try again';
}
