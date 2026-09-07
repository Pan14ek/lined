import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FieldRowOrientation = 'responsive' | 'horizontal' | 'vertical';

const ORIENTATION_CLASSES: Record<FieldRowOrientation, string> = {
  responsive: 'flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
  horizontal: 'flex-row items-center justify-between gap-4',
  vertical: 'flex-col gap-2',
};

export interface FieldRowProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  orientation?: FieldRowOrientation;
  disabled?: boolean;
  className?: string;
}

/**
 * Purpose: label (+ description) on one side and a control on the other.
 *
 * When to use: a settings-style row pairing a label/description with a single
 * control (switch, select, text field).
 *
 * When not to use: a full labeled form field with validation — use `TextField`/
 * `Select`/`Textarea` directly, which already own their own label.
 */
export const FieldRow = ({ label, description, children, orientation = 'responsive', disabled, className }: FieldRowProps) => {
  return (
    <div className={cn('flex border-b border-border py-3.5 last:border-b-0', ORIENTATION_CLASSES[orientation], className)}>
      <div>
        <div className={cn('text-sm font-medium', disabled ? 'text-muted-foreground' : 'text-foreground')}>{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      {children}
    </div>
  );
};
