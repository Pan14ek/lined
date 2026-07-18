import type { ReactNode } from 'react';

/** Shared input styling for settings-row controls (text inputs and selects). */
export const SETTINGS_INPUT_CLASS =
  'h-10 w-56 rounded-lg border border-border bg-input-bg px-3 text-sm text-text-primary focus:border-brand-green focus:outline-none';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

/** Label(+description) on the left, a control on the right — shared by Profile/Password/Appearance rows. */
export const SettingsRow = ({ label, description, children }: SettingsRowProps) => (
  <div className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
    <div>
      <div className="text-sm font-medium text-text-secondary">{label}</div>
      {description && <div className="mt-0.5 text-xs text-text-secondary">{description}</div>}
    </div>
    {children}
  </div>
);
