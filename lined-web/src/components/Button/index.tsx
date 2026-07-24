import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a centered spinner over an invisible (width-preserving) label and forces disabled. */
  pending?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-green text-white font-semibold hover:bg-brand-green-dark',
  secondary: 'border border-border bg-surface text-text-secondary hover:bg-surface-hover',
  danger: 'bg-red-600 text-white font-semibold hover:bg-red-700',
};

export const Button = ({
  variant = 'primary',
  pending = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      className={cn(
        'relative h-10 rounded-lg px-4 text-sm transition-colors disabled:opacity-60',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      <span className={cn(pending && 'invisible')}>{children}</span>
      {pending && (
        <Loader2
          className="absolute inset-0 m-auto size-4 animate-spin"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
