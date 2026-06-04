import { Link } from 'react-router-dom';

export function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-beige">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary">Lined</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Where life and quality time meet.
          </p>
        </div>
        <p className="text-center text-text-muted">
          Sign in form coming soon...
        </p>
        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" className="font-medium text-brand-green hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
