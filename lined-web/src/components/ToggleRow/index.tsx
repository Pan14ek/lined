interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleRow = ({ label, description, checked, onChange }: ToggleRowProps) => {
  return (
    <div className="flex items-center justify-between border-b border-border py-3.5">
      <div>
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && <div className="mt-0.5 text-xs text-text-secondary">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-green' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-surface shadow-sm transition-[left]',
            checked ? 'left-[23px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  );
}
import { cn } from '@/lib/utils';
