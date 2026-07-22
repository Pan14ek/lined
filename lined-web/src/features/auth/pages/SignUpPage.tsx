import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getErrorStatus } from '@/lib/apiClient';
import { AuthCard } from '@/features/auth/AuthCard';
import { FormField } from '@/components/FormField';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { useSignUp } from '@/features/auth/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';
import { useAuthStore } from '@/store/auth';

interface FormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate =
  (t: TFunction<'auth'>) =>
  (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.username.trim()) errors.username = t('signUp.errors.usernameRequired');
    if (!values.email.trim()) {
      errors.email = t('signUp.errors.emailRequired');
    } else if (!EMAIL_RE.test(values.email)) {
      errors.email = t('signUp.errors.emailInvalid');
    }
    if (!values.password) {
      errors.password = t('signUp.errors.passwordRequired');
    } else if (values.password.length < 8) {
      errors.password = t('signUp.errors.passwordTooShort');
    }
    if (!values.confirmPassword) {
      errors.confirmPassword = t('signUp.errors.confirmPasswordRequired');
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = t('signUp.errors.passwordsDoNotMatch');
    }
    return errors;
  }

export const SignUpPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const signUp = useSignUp();
  const setUserId = useAuthStore((s) => s.setUserId);

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { username: '', email: '', password: '', confirmPassword: '' },
    validate(t),
  );

  const handleSubmit = (e: React.FormEvent) => {
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

  const serverError = getServerErrorMessage(t, signUp.error);

  return (
    <AuthCard heading={t('signUp.heading')} subheading={t('signUp.subheading')}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <FormField
            id="signup-username"
            label={t('signUp.usernameLabel')}
            type="text"
            autoComplete="username"
            value={values.username}
            onChange={(v) => set('username', v)}
            onBlur={() => markTouched('username')}
            placeholder={t('signUp.usernamePlaceholder')}
            error={touched.username ? errors.username : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signup-email"
            label={t('signUp.emailLabel')}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(v) => set('email', v)}
            onBlur={() => markTouched('email')}
            placeholder={t('signUp.emailPlaceholder')}
            error={touched.email ? errors.email : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signup-password"
            label={t('signUp.passwordLabel')}
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(v) => set('password', v)}
            onBlur={() => markTouched('password')}
            placeholder={t('signUp.passwordPlaceholder')}
            error={touched.password ? errors.password : null}
          />
        </div>
        <div className="mt-5">
          <FormField
            id="signup-confirm-password"
            label={t('signUp.confirmPasswordLabel')}
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(v) => set('confirmPassword', v)}
            onBlur={() => markTouched('confirmPassword')}
            placeholder={t('signUp.confirmPasswordPlaceholder')}
            error={touched.confirmPassword ? errors.confirmPassword : null}
          />
        </div>

        <p className="mt-4 text-xs text-text-muted">
          {t('signUp.termsNotice')}
        </p>

        {serverError && <AuthAlert message={serverError} />}

        <button
          type="submit"
          disabled={signUp.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {signUp.isPending ? t('signUp.submitting') : t('signUp.submit')}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          {t('signUp.alreadyHaveAccount')}{' '}
          <Link to="/sign-in" className="font-medium text-brand-green hover:underline">
            {t('signUp.signIn')}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

const getServerErrorMessage = (t: TFunction<'auth'>, error: unknown): string | null => {
  if (!error) return null;
  if (getErrorStatus(error) === 409) {
    return t('signUp.errors.usernameOrEmailTaken');
  }
  return t('errors.generic');
}
