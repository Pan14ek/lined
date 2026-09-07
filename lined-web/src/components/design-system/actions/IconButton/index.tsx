import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as ButtonPrimitive } from '@/components/ui/button';

export type IconButtonVariant = 'ghost' | 'secondary' | 'destructive';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_MAP: Record<IconButtonVariant, 'ghost' | 'outline' | 'destructive'> = {
  ghost: 'ghost',
  secondary: 'outline',
  destructive: 'destructive',
};

const SIZE_MAP: Record<IconButtonSize, 'icon-sm' | 'icon' | 'icon-lg'> = {
  sm: 'icon-sm',
  md: 'icon',
  lg: 'icon-lg',
};

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** The icon to render. Should be a single icon element (e.g. from lucide-react). */
  icon: ReactNode;
  /**
   * Accessible name for the button. Mandatory: an icon-only control has no
   * visible text, so screen readers rely entirely on this label.
   */
  'aria-label': string;
}

/**
 * Purpose: icon-only interactive action (close dialog, previous/next, overflow menu, dismiss).
 *
 * When to use: the action is common/obvious from the icon alone and a text
 * label would be visual noise (toolbar/header actions).
 *
 * When not to use: the action needs a text label to be understood — use `Button`.
 */
export const IconButton = ({
  variant = 'ghost',
  size = 'md',
  icon,
  type = 'button',
  ...props
}: IconButtonProps) => {
  return (
    <ButtonPrimitive type={type} variant={VARIANT_MAP[variant]} size={SIZE_MAP[size]} {...props}>
      {icon}
    </ButtonPrimitive>
  );
};
