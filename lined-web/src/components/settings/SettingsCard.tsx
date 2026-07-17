import type { ReactNode } from 'react';

interface SettingsCardProps {
  id: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared card shell for the User/Lobby Settings pages — header + row list + optional footer. */
export const SettingsCard = ({ id, title, children, footer }: SettingsCardProps) => (
  <section
    id={id}
    className="mb-5 scroll-mt-6 overflow-hidden rounded-xl bg-white shadow-[var(--shadow-sm)]"
  >
    <div className="border-b border-border px-6 py-3.5 text-sm font-bold text-text-primary">
      {title}
    </div>
    <div className="px-6">{children}</div>
    {footer && (
      <div className="flex justify-end border-t border-border px-6 py-4">{footer}</div>
    )}
  </section>
);
