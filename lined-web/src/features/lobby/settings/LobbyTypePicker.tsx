import type { LobbyType } from '@/features/lobby/model';
import { LOBBY_TYPE_ICONS, LOBBY_TYPE_LABELS, LOBBY_TYPES } from '@/features/lobby/lib/constants';
import { cn } from '@/lib/utils';

interface LobbyTypePickerProps {
  value: LobbyType;
  onChange: (type: LobbyType) => void;
}

export const LobbyTypePicker = ({ value, onChange }: LobbyTypePickerProps) => {
  return (
    <div role="radiogroup" aria-label="Lobby type" className="grid grid-cols-2 gap-2.5">
      {LOBBY_TYPES.map((type) => {
        const isSelected = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(type)}
            className={cn(
              'cursor-pointer rounded-lg border-2 px-3 py-3.5 text-center transition-colors',
              isSelected
                ? 'border-brand-green bg-brand-green-light'
                : 'border-border bg-surface hover:bg-surface-hover',
            )}
          >
            <div className="mb-1.5 text-xl leading-none">{LOBBY_TYPE_ICONS[type]}</div>
            <div className="text-xs font-semibold text-text-primary">
              {LOBBY_TYPE_LABELS[type]}
            </div>
          </button>
        );
      })}
    </div>
  );
};
