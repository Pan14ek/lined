import { useId, type ReactNode } from 'react';
import {
  Select as SelectPrimitive,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string | number> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T extends string | number> {
  id?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  wrapperClassName?: string;
}

/**
 * Purpose: canonical control for choosing one value from a fixed, known set of options.
 *
 * When to use: a small-to-medium fixed option set with a single selection.
 *
 * When not to use: 2-4 highly visible options where a segmented control reads
 * better, or a large searchable list (needs a dedicated combobox).
 */
export const Select = <T extends string | number>({
  id,
  label,
  description,
  error,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  required,
  wrapperClassName,
}: SelectProps<T>) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <SelectPrimitive
        value={value ?? null}
        onValueChange={(next) => {
          if (next != null) onValueChange(next as T);
        }}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : description ? descriptionId : undefined}
        >
          <SelectValue placeholder={placeholder}>
            {(selected: T | null) => options.find((option) => option.value === selected)?.label ?? placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive>
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
