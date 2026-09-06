import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

/**
 * Purpose: heading row for a page section — title (+ description) with an
 * optional trailing action (e.g. a "View all" link).
 *
 * When to use: above a list/grid of items on a dashboard-style page.
 *
 * When not to use: inside a `SectionCard`, which already renders its own header.
 */
export const SectionHeader = ({ title, description, action }: SectionHeaderProps) => (
  <div className="mb-3 flex items-center justify-between gap-4">
    <div>
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
