import type { ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const TONE_ICONS: Record<AlertTone, ReactNode> = {
  info: <Info className="size-4" />,
  success: <CircleCheck className="size-4" />,
  warning: <TriangleAlert className="size-4" />,
  danger: <CircleAlert className="size-4" />,
};

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  /** Overrides the default per-tone icon. Pass `null` to render no icon. */
  icon?: ReactNode | null;
  /** Action rendered at the end of the alert (e.g. a retry button/link). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Purpose: inline banner for surfacing status, warnings, or errors tied to the
 * surrounding content (a form, a section, a page).
 *
 * When to use: form/mutation errors, warnings about state (e.g. a conflict),
 * confirmation messages.
 *
 * When not to use: a short inline status label — use `Badge`. A blocking
 * confirmation flow — use `Dialog`/`ConfirmDialog`.
 */
export const Alert = ({ tone = 'info', title, icon, action, children, className }: AlertProps) => {
  const resolvedIcon = icon === null ? null : (icon ?? TONE_ICONS[tone]);

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', TONE_CLASSES[tone], className)}
    >
      {resolvedIcon && <span className="mt-0.5 shrink-0">{resolvedIcon}</span>}
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(!title && 'text-current')}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
