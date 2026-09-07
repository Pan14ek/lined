import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AuthCard } from '@/features/auth/AuthCard';
import { TextField } from '@/components/design-system/forms/TextField';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { useResetPassword } from '@/features/auth/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

const validate =
  (t: TFunction<'auth'>) =>
  (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.newPassword) {
      errors.newPassword = t('resetPassword.errors.passwordRequired');
    } else if (values.newPassword.length < 8) {
      errors.newPassword = t('resetPassword.errors.passwordTooShort');
    }
    if (!values.confirmPassword) {
      errors.confirmPassword = t('resetPassword.errors.confirmPasswordRequired');
    } else if (values.confirmPassword !== values.newPassword) {
      errors.confirmPassword = t('resetPassword.errors.passwordsDoNotMatch');
    }
    return errors;
  }

const InvalidTokenCard = () => {
  const { t } = useTranslation('auth');
  return (
    <AuthCard heading={t('resetPassword.heading')} subheading={t('resetPassword.subheading')}>
      <AuthAlert message={t('resetPassword.invalidLink')} />
      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link to="/forgot-password" className="font-medium text-brand-green hover:underline">
          {t('resetPassword.requestNewLink')}
        </Link>
      </p>
    </AuthCard>
  );
}

export const ResetPasswordPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { newPassword: '', confirmPassword: '' },
    validate(t),
  );

  if (!token) {
    return <InvalidTokenCard />;
  }
  const resetToken = token;

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        markAllTouched();
        if (hasErrors) return;

        resetPassword.mutate(
          { token: resetToken, newPassword: values.newPassword },
          { onSuccess: () => navigate('/sign-in?reset=success') },
        );
      }

  return (
    <AuthCard heading={t('resetPassword.heading')} subheading={t('resetPassword.subheading')}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <TextField
            id="reset-password-new"
            label={t('resetPassword.newPasswordLabel')}
            type="password"
            autoComplete="new-password"
            value={values.newPassword}
            onValueChange={(v) => set('newPassword', v)}
            onBlur={() => markTouched('newPassword')}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            error={touched.newPassword ? errors.newPassword : null}
          />
        </div>
        <div className="mt-5">
          <TextField
            id="reset-password-confirm"
            label={t('resetPassword.confirmPasswordLabel')}
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onValueChange={(v) => set('confirmPassword', v)}
            onBlur={() => markTouched('confirmPassword')}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            error={touched.confirmPassword ? errors.confirmPassword : null}
          />
        </div>

        {resetPassword.isError && (
          <AuthAlert message={t('resetPassword.invalidLink')} />
        )}

        <button
          type="submit"
          disabled={resetPassword.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {resetPassword.isPending ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </button>

        {resetPassword.isError && (
          <p className="mt-6 text-center text-sm text-text-secondary">
            <Link to="/forgot-password" className="font-medium text-brand-green hover:underline">
              {t('resetPassword.requestNewLink')}
            </Link>
          </p>
        )}
      </form>
    </AuthCard>
  );
}
