import { Switch as SwitchPrimitive } from '@/components/ui/switch';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * Purpose: low-level boolean on/off toggle.
 *
 * When to use: a standalone boolean control, or as the control half of a
 * `SwitchField` (label + description + switch).
 *
 * When not to use: a control that also needs a visible label — prefer
 * `SwitchField`, which wires up the label/description for you.
 */
export const Switch = ({ checked, onCheckedChange, disabled, ...props }: SwitchProps) => {
  return (
    <SwitchPrimitive
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      {...props}
    />
  );
};
