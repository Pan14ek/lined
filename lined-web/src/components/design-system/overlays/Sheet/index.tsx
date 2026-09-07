import type { ReactNode } from 'react';
import {
  Sheet as SheetPrimitive,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type SheetSide = 'right' | 'left' | 'top' | 'bottom';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: SheetSide;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Purpose: side-anchored panel (drawer) for a focused task without leaving the
 * page context — e.g. a task's full detail/edit view.
 *
 * When to use: content naturally reads as a drawer sliding in from an edge.
 *
 * When not to use: a centered modal workflow — use `Dialog`.
 */
export const Sheet = ({ open, onOpenChange, side = 'right', title, description, footer, children }: SheetProps) => {
  return (
    <SheetPrimitive open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side}>
        {(title || description) && (
          <SheetHeader>
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </SheetPrimitive>
  );
};

/**
 * Compound sub-parts, exported for feature code that needs a custom layout
 * (e.g. a multi-section form) rather than the simplified `Sheet` API above.
 * Still routes through the internal Base UI primitive — feature code should
 * never import `@/components/ui/sheet` directly.
 */
export { SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter };
export const SheetRoot = SheetPrimitive;
