import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Textarea as TextareaPrimitive } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'onChange' | 'value' | 'className'> {
  id?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  /** Whether the control can be resized vertically. Horizontal resize is never allowed. */
  resize?: 'none' | 'vertical';
  wrapperClassName?: string;
}

/**
 * Purpose: canonical multi-line text control.
 *
 * When to use: free-form text longer than a single line (descriptions, notes).
 *
 * When not to use: a single line of text — use `TextField`.
 */
export const Textarea = ({
  id,
  label,
  description,
  error,
  value,
  onValueChange,
  resize = 'vertical',
  disabled,
  required,
  wrapperClassName,
  ...props
}: TextareaProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <TextareaPrimitive
        id={fieldId}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : description ? descriptionId : undefined}
        className={cn(resize === 'none' && 'resize-none')}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )
      )}
    </div>
  );
};
