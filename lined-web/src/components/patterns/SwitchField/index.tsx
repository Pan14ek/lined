import type { ReactNode } from 'react';
import { FieldRow } from '../FieldRow';
import { Switch } from '@/components/design-system/forms/Switch';

export interface SwitchFieldProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Purpose: common label + description + switch composition for a settings row.
 *
 * When to use: a single boolean preference in a settings list (notifications,
 * appearance toggles, ...).
 *
 * When not to use: a standalone switch with no label — use `Switch` directly.
 */
export const SwitchField = ({ label, description, checked, onCheckedChange, disabled }: SwitchFieldProps) => {
  return (
    <FieldRow label={label} description={description} disabled={disabled}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={typeof label === 'string' ? label : undefined}
      />
    </FieldRow>
  );
};
