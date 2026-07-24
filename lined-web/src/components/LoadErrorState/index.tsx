import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LoadErrorStateProps {
  onRetry: () => void;
  message?: string;
  className?: string;
  testId?: string;
}

export const LoadErrorState = ({ onRetry, message, className, testId }: LoadErrorStateProps) => {
  const { t } = useTranslation('common');

  return (
    <div
      className={cn('flex flex-col items-center gap-2 rounded-xl border border-border p-6 text-center', className)}
      data-testid={testId}
    >
      <p className="text-sm text-text-secondary">{message ?? t('errors.generic')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-brand-green hover:underline"
      >
        {t('actions.retry')}
      </button>
    </div>
  );
}
