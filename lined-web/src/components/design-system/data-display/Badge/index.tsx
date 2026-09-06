import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeVariant = 'soft' | 'solid' | 'outline';

const badgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3',
  {
    variants: {
      tone: {
        neutral: '',
        brand: '',
        success: '',
        warning: '',
        danger: '',
        info: '',
      },
      variant: {
        soft: '',
        solid: '',
        outline: 'border bg-transparent',
      },
      size: {
        sm: 'h-4.5 text-[10px]',
        md: 'h-5 text-xs',
      },
    },
    compoundVariants: [
      { tone: 'neutral', variant: 'soft', class: 'bg-muted text-muted-foreground' },
      { tone: 'neutral', variant: 'solid', class: 'bg-secondary text-secondary-foreground' },
      { tone: 'neutral', variant: 'outline', class: 'border-border text-foreground' },

      { tone: 'brand', variant: 'soft', class: 'bg-primary/10 text-primary' },
      { tone: 'brand', variant: 'solid', class: 'bg-primary text-primary-foreground' },
      { tone: 'brand', variant: 'outline', class: 'border-primary/40 text-primary' },

      { tone: 'success', variant: 'soft', class: 'bg-success/10 text-success' },
      { tone: 'success', variant: 'solid', class: 'bg-success text-success-foreground' },
      { tone: 'success', variant: 'outline', class: 'border-success/40 text-success' },

      { tone: 'warning', variant: 'soft', class: 'bg-warning/10 text-warning' },
      { tone: 'warning', variant: 'solid', class: 'bg-warning text-warning-foreground' },
      { tone: 'warning', variant: 'outline', class: 'border-warning/40 text-warning' },

      { tone: 'danger', variant: 'soft', class: 'bg-destructive/10 text-destructive' },
      { tone: 'danger', variant: 'solid', class: 'bg-destructive text-destructive-foreground' },
      { tone: 'danger', variant: 'outline', class: 'border-destructive/40 text-destructive' },

      { tone: 'info', variant: 'soft', class: 'bg-info/10 text-info' },
      { tone: 'info', variant: 'solid', class: 'bg-info text-info-foreground' },
      { tone: 'info', variant: 'outline', class: 'border-info/40 text-info' },
    ],
    defaultVariants: { tone: 'neutral', variant: 'soft', size: 'md' },
  },
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Purpose: generic short metadata/status pill.
 *
 * When to use: rendering a short status/category label.
 *
 * When not to use: this component has no domain knowledge — a domain
 * status (task status, lobby type, ...) should be mapped to `tone`/label by
 * a feature-owned wrapper (e.g. `TaskStatusBadge`), not reimplemented here.
 */
export const Badge = ({ tone, variant, size, icon, className, children }: BadgeProps) => {
  return (
    <span className={cn(badgeVariants({ tone, variant, size }), className)}>
      {icon}
      {children}
    </span>
  );
};
