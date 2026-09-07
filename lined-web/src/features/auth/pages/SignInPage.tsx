import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getErrorStatus } from '@/lib/apiClient';
import { AuthCard } from '@/features/auth/AuthCard';
import { TextField } from '@/components/design-system/forms/TextField';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { useSignIn } from '@/features/auth/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';
import { useAuthStore } from '@/store/auth';

interface FormValues {
  identifier: string;
  password: string;
}

const validate =
  (t: TFunction<'auth'>) =>
  (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.identifier.trim()) errors.identifier = t('signIn.errors.identifierRequired');
    if (!values.password) errors.password = t('signIn.errors.passwordRequired');
    return errors;
  }

export const SignInPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useSignIn();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const resetSucceeded = searchParams.get('reset') === 'success';

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { identifier: '', password: '' },
    validate(t),
  );

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        markAllTouched();
        if (hasErrors) return;

        signIn.mutate(values, {
          onSuccess: (res) => {
            setAccessToken(res.accessToken);
            navigate('/');
          },
        });
      }

  const serverError = getServerErrorMessage(t, signIn.error);

  return (
    <AuthCard heading={t('signIn.heading')} subheading={t('signIn.subheading')}>
      {resetSucceeded && (
        <AuthAlert variant="success" message={t('signIn.resetSuccess')} />
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <TextField
            id="signin-email"
            label={t('signIn.emailLabel')}
            type="email"
            autoComplete="username"
            value={values.identifier}
            onValueChange={(v) => set('identifier', v)}
            onBlur={() => markTouched('identifier')}
            placeholder={t('signIn.emailPlaceholder')}
            error={touched.identifier ? errors.identifier : null}
          />
        </div>
        <div className="mt-5">
          <TextField
            id="signin-password"
            label={t('signIn.passwordLabel')}
            type="password"
            autoComplete="current-password"
            value={values.password}
            onValueChange={(v) => set('password', v)}
            onBlur={() => markTouched('password')}
            placeholder={t('signIn.passwordPlaceholder')}
            error={touched.password ? errors.password : null}
          />
          <div className="mt-1.5 text-xs">
            <Link to="/forgot-password" className="font-medium text-brand-green hover:underline">
              {t('signIn.forgotPassword')}
            </Link>
          </div>
        </div>

        {serverError && <AuthAlert message={serverError} />}

        <button
          type="submit"
          disabled={signIn.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {signIn.isPending ? t('signIn.submitting') : t('signIn.submit')}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          {t('signIn.newToLined')}{' '}
          <Link to="/sign-up" className="font-medium text-brand-green hover:underline">
            {t('signIn.createAccount')}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

const getServerErrorMessage = (t: TFunction<'auth'>, error: unknown): string | null => {
  if (!error) return null;
  if (getErrorStatus(error) === 401) {
    return t('signIn.errors.invalidCredentials');
  }
  return t('errors.generic');
}
