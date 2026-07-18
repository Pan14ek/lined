import { Link } from 'react-router-dom';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  /** react-router Link target; mutually exclusive with onClick. */
  to?: string;
}

interface EmptyStateProps {
  icon?: string;
  message: string;
  action?: EmptyStateAction;
  variant?: 'card' | 'inline';
  /** Override the message text color, e.g. for a dark-background container. */
  className?: string;
  testId?: string;
}

const ActionControl = ({ action }: { action: EmptyStateAction }) => {
  const className = 'text-brand-green hover:underline';
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
}

export const EmptyState = ({
  icon,
  message,
  action,
  variant = 'card',
  className = 'text-text-secondary',
  testId,
}: EmptyStateProps) => {
  if (variant === 'inline') {
    return (
      <p className={`text-sm ${className}`} data-testid={testId}>
        {message}
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
      className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center"
      data-testid={testId}
    >
      {icon && <span className="text-2xl leading-none">{icon}</span>}
      <p className={`text-sm ${className}`}>{message}</p>
      {action && (
        <div className="mt-1 text-sm font-medium">
          <ActionControl action={action} />
        </div>
      )}
    </div>
  );
}
