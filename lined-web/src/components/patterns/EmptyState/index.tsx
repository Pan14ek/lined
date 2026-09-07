import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: ReactNode;
  onClick?: () => void;
  /** react-router `Link` target; mutually exclusive with `onClick`. */
  to?: string;
}

export type EmptyStateVariant = 'card' | 'inline';
export type EmptyStateSize = 'sm' | 'md' | 'lg';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: EmptyStateAction;
  variant?: EmptyStateVariant;
  size?: EmptyStateSize;
  /** Override the message text color, e.g. for a dark-background container. */
  className?: string;
}

const ActionControl = ({ action }: { action: EmptyStateAction }) => {
  const className = 'text-primary hover:underline';
  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
};

/**
 * Purpose: standard empty-list placeholder — icon, message, and an optional action.
 *
 * When to use: any list/collection that can be empty.
 *
 * When not to use: a failed data fetch — use `ErrorState`.
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  variant = 'card',
  size = 'md',
  className = 'text-muted-foreground',
}: EmptyStateProps) => {
  if (variant === 'inline') {
    return (
      <p className={cn('text-sm', className)}>
        {title}
        {action && (
          <>
            {' — '}
            <ActionControl action={action} />
          </>
        )}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border text-center',
        size === 'sm' ? 'p-4' : size === 'lg' ? 'p-8' : 'p-6',
      )}
    >
      {icon && <span className="text-2xl leading-none">{icon}</span>}
      <p className={cn('text-sm', className)}>{title}</p>
      {description && <p className={cn('text-xs', className)}>{description}</p>}
      {action && (
        <div className="mt-1 text-sm font-medium">
          <ActionControl action={action} />
        </div>
      )}
    </div>
  );
};
