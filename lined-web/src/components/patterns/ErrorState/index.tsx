import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface ErrorStateAction {
  label: ReactNode;
  onClick: () => void;
}

export type ErrorStateSize = 'sm' | 'md' | 'lg';

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Custom retry/recovery action. Overrides `onRetry` when both are given. */
  action?: ErrorStateAction;
  /** Convenience for the common case: a single retry action labeled with the default "Retry" copy. */
  onRetry?: () => void;
  size?: ErrorStateSize;
  className?: string;
}

/**
 * Purpose: standard failed-data-fetch placeholder with a recovery action.
 *
 * When to use: a query/mutation load failure where the user can retry.
 *
 * When not to use: an empty (but successfully loaded) list — use `EmptyState`.
 */
export const ErrorState = ({ title, description, action, onRetry, size = 'md', className }: ErrorStateProps) => {
  const { t } = useTranslation('common');
  const resolvedAction = action ?? (onRetry ? { label: t('actions.retry'), onClick: onRetry } : undefined);

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-border text-center',
        size === 'sm' ? 'p-4' : size === 'lg' ? 'p-8' : 'p-6',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{title ?? t('errors.generic')}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {resolvedAction && (
        <button
          type="button"
          onClick={resolvedAction.onClick}
          className="text-sm font-medium text-primary hover:underline"
        >
          {resolvedAction.label}
        </button>
      )}
    </div>
  );
};
