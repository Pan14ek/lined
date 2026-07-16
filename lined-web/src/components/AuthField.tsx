import type { InputHTMLAttributes } from 'react';

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange' | 'className'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function AuthField({ id, label, value, onChange, error, ...rest }: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-12 w-full rounded-lg border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-border focus:border-brand-green'
        }`}
        {...rest}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
