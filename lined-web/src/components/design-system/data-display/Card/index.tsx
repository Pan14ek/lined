import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'plain' | 'outlined' | 'elevated' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<CardVariant, string> = {
  plain: 'bg-card text-card-foreground',
  outlined: 'bg-card text-card-foreground border border-border',
  elevated: 'bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm',
  interactive:
    'bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm transition-shadow hover:shadow-md cursor-pointer',
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: 'px-0',
  sm: 'px-3',
  md: 'px-4',
  lg: 'px-6',
};

const GAP_CLASSES: Record<CardPadding, string> = {
  none: 'py-0',
  sm: 'py-3',
  md: 'py-4',
  lg: 'py-6',
};

const CardPaddingContext = createContext<CardPadding>('md');

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

/**
 * Purpose: generic surface/container for grouping related content.
 *
 * When to use: any card-like surface. Compose with `CardHeader`, `CardTitle`,
 * `CardDescription`, `CardContent`, and `CardFooter`.
 *
 * When not to use: a domain-specific card (e.g. a lobby/task/plan card) — those
 * remain feature-owned and should compose this `Card` rather than reimplement it.
 */
export const Card = ({ variant = 'elevated', padding = 'md', className, children, ...props }: CardProps) => {
  return (
    <CardPaddingContext.Provider value={padding}>
      <div
        data-slot="card"
        className={cn('flex flex-col gap-4 overflow-hidden rounded-xl text-sm', VARIANT_CLASSES[variant], className)}
        {...props}
      >
        {children}
      </div>
    </CardPaddingContext.Provider>
  );
};

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const padding = useContext(CardPaddingContext);
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1 pt-1', PADDING_CLASSES[padding], className)}
      {...props}
    />
  );
};

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="card-title" className={cn('text-base leading-snug font-medium', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
);

export const CardAction = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div data-slot="card-action" className={cn('ml-auto self-start', className)}>
    {children}
  </div>
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const padding = useContext(CardPaddingContext);
  return <div data-slot="card-content" className={cn(PADDING_CLASSES[padding], className)} {...props} />;
};

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const padding = useContext(CardPaddingContext);
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center border-t border-border pb-1',
        PADDING_CLASSES[padding],
        GAP_CLASSES[padding],
        className,
      )}
      {...props}
    />
  );
};
