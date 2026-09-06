import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button as ButtonPrimitive } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_MAP: Record<ButtonVariant, 'default' | 'outline' | 'ghost' | 'destructive' | 'link'> = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  destructive: 'destructive',
  link: 'link',
};

const SIZE_MAP: Record<ButtonSize, 'default' | 'sm' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * Visual importance and semantic role of the action.
   * Use `primary` for the single main action of a flow, `secondary` for a
   * bordered alternate action, `ghost` for low-emphasis actions, `destructive`
   * for irreversible/dangerous actions, and `link` for inline text-styled actions.
   */
  variant?: ButtonVariant;
  /** Button height/density. */
  size?: ButtonSize;
  /** Shows an in-button spinner and forces `disabled`. Layout width is preserved. */
  loading?: boolean;
  /** Icon rendered before the label. */
  leadingIcon?: ReactNode;
  /** Icon rendered after the label. */
  trailingIcon?: ReactNode;
  /** Stretches the button to the full width of its container. */
  fullWidth?: boolean;
  children?: ReactNode;
}

/**
 * Purpose: canonical action control for all normal actions and form submissions.
 *
 * When to use: submitting a form, triggering an application action, opening a
 * workflow/dialog.
 *
 * When not to use: normal page navigation (use a link), icon-only actions
 * (use `IconButton`).
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) => {
  return (
    <ButtonPrimitive
      type={type}
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('relative', fullWidth && 'w-full', className)}
      {...props}
    >
      {leadingIcon && (
        <span data-icon="inline-start" className={cn(loading && 'invisible')} aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span className={cn(loading && 'invisible')}>{children}</span>
      {trailingIcon && (
        <span data-icon="inline-end" className={cn(loading && 'invisible')} aria-hidden="true">
          {trailingIcon}
        </span>
      )}
      {loading && (
        <Loader2 className="absolute inset-0 m-auto size-4 animate-spin" aria-hidden="true" />
      )}
    </ButtonPrimitive>
  );
};
