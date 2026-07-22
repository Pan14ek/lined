import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AuthCard } from '@/features/auth/AuthCard';
import { FormField } from '@/components/FormField';
import { useRequestPasswordReset } from '@/features/auth/hooks/useAuth';
import { useFormState } from '@/hooks/useFormState';

interface FormValues {
  identifier: string;
}

const validate =
  (t: TFunction<'auth'>) =>
  (values: FormValues): Partial<Record<keyof FormValues, string>> => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!values.identifier.trim()) errors.identifier = t('forgotPassword.errors.identifierRequired');
    return errors;
  }

export const ForgotPasswordPage = () => {
  const { t } = useTranslation('auth');
  const requestReset = useRequestPasswordReset();

  const { values, errors, touched, set, markTouched, markAllTouched, hasErrors } = useFormState<FormValues>(
    { identifier: '' },
    validate(t),
  );

  const handleSubmit = (e: React.FormEvent) => {
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
      <AuthCard heading={t('forgotPassword.checkEmailHeading')} subheading={t('forgotPassword.checkEmailSubheading')}>
        <p className="mt-5 text-sm text-text-secondary">
          {t('forgotPassword.checkEmailBody')}
        </p>
        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link to="/sign-in" className="font-medium text-brand-green hover:underline">
            {t('forgotPassword.backToSignIn')}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard heading={t('forgotPassword.heading')} subheading={t('forgotPassword.subheading')}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <FormField
            id="forgot-password-identifier"
            label={t('forgotPassword.identifierLabel')}
            type="text"
            autoComplete="username"
            value={values.identifier}
            onChange={(v) => set('identifier', v)}
            onBlur={() => markTouched('identifier')}
            placeholder={t('forgotPassword.identifierPlaceholder')}
            error={touched.identifier ? errors.identifier : null}
          />
        </div>

        <button
          type="submit"
          disabled={requestReset.isPending}
          className="mt-6 h-12 w-full rounded-lg bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {requestReset.isPending ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link to="/sign-in" className="font-medium text-brand-green hover:underline">
            {t('forgotPassword.backToSignIn')}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
