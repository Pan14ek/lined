import type { ReactNode } from 'react';

export interface SectionCardProps {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Purpose: page-section card shell — header (title/description/action) + body + optional footer.
 *
 * When to use: a settings section, or any page section that groups a list of
 * rows/content under one heading.
 *
 * When not to use: a general-purpose surface with custom internal layout — use `Card`.
 */
export const SectionCard = ({ id, title, description, action, children, footer }: SectionCardProps) => (
  <section id={id} className="mb-5 scroll-mt-6 overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm">
    {(title || action) && (
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3.5">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className="px-6">{children}</div>
    {footer && <div className="flex justify-end border-t border-border px-6 py-4">{footer}</div>}
  </section>
);
