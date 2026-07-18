import type { LobbyType } from '@/features/lobby/model';
import { LOBBY_TYPE_ICONS, LOBBY_TYPE_LABELS, LOBBY_TYPES } from '@/features/lobby/lib/constants';

interface LobbyTypePickerProps {
  value: LobbyType;
  onChange: (type: LobbyType) => void;
}

export const LobbyTypePicker = ({ value, onChange }: LobbyTypePickerProps) => {
  return (
    <div role="radiogroup" aria-label="Lobby type" className="grid grid-cols-2 gap-2.5">
      {LOBBY_TYPES.map((type) => {
        const selected = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={`cursor-pointer rounded-lg border-2 px-3 py-3.5 text-center transition-colors ${
              selected
                ? 'border-brand-green bg-brand-green-light'
                : 'border-border bg-white hover:bg-gray-50'
            }`}
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
