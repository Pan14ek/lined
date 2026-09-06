import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange' | 'value' | 'className'> {
  id?: string;
  /** Visible label. Always provide one — it is what makes the field accessible. */
  label?: ReactNode;
  /** Helper text shown below the field when there is no error. */
  description?: ReactNode;
  /** Validation error. Replaces `description` and marks the field invalid. */
  error?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  /** Icon rendered inside the field, before the text. */
  leadingIcon?: ReactNode;
  /** Arbitrary element rendered inside the field, after the text (e.g. a reveal-password toggle). */
  trailingElement?: ReactNode;
  /** Wrapper class name, applied to the outer `<div>` — not the `<input>` itself. */
  wrapperClassName?: string;
}

/**
 * Purpose: canonical single-line text-like control (text, email, password, date, number, ...).
 *
 * When to use: any labeled single-line input in a form.
 *
 * When not to use: multi-line input (use `Textarea`), a fixed set of options
 * (use `Select`), or a search box that needs a clear affordance (use `SearchField`).
 */
export const TextField = ({
  id,
  label,
  description,
  error,
  value,
  onValueChange,
  leadingIcon,
  trailingElement,
  required,
  disabled,
  wrapperClassName,
  ...props
}: TextFieldProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-2.5 flex items-center text-muted-foreground [&_svg]:size-4">
            {leadingIcon}
          </span>
        )}
        <Input
          id={fieldId}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : description ? descriptionId : undefined}
          className={cn(leadingIcon && 'pl-8', trailingElement && 'pr-8')}
          {...props}
        />
        {trailingElement && (
          <span className="absolute right-2.5 flex items-center">{trailingElement}</span>
        )}
      </div>
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
