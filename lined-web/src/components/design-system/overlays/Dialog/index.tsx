import type { ReactNode } from 'react';
import {
  Dialog as DialogPrimitive,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogResponsive = 'centered' | 'fullscreen-mobile';

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

const RESPONSIVE_CLASSES: Record<DialogResponsive, string> = {
  centered: '',
  'fullscreen-mobile':
    'max-sm:top-0 max-sm:left-0 max-sm:h-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
};

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: DialogSize;
  /** `fullscreen-mobile` makes the dialog fill the viewport below the `sm` breakpoint. */
  responsive?: DialogResponsive;
  children?: ReactNode;
  footer?: ReactNode;
  /** Content max-height + scroll, for dialogs whose body can overflow. */
  scrollableContent?: boolean;
}

/**
 * Purpose: canonical modal shell — accessible dialog semantics, focus trap and
 * restoration, escape-to-close, click-outside, and responsive layout come
 * from Base UI.
 *
 * When to use: any modal workflow (create/edit forms, detail views).
 *
 * When not to use: a simple confirm/cancel prompt — use `ConfirmDialog`. A
 * side-anchored panel — use `Sheet`.
 */
export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  responsive = 'centered',
  children,
  footer,
  scrollableContent = false,
}: DialogProps) => {
  return (
    <DialogPrimitive open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(SIZE_CLASSES[size], RESPONSIVE_CLASSES[responsive])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && (
          <div className={cn(scrollableContent && 'max-h-[60vh] overflow-y-auto')}>{children}</div>
        )}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </DialogPrimitive>
  );
};
