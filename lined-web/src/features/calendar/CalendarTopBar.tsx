import { ChevronLeft, ChevronRight, ListFilter, Plus } from 'lucide-react';
import type { ViewMode } from '@/store/calendar';
import type { LobbyDto } from '@/features/lobby/model';
import { LOBBY_TYPE_LABELS, lobbyAccentColor } from '@/features/lobby/lib/constants';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

interface CalendarTopBarProps {
  title: string;
  viewMode: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNewEvent: () => void;
  /** Opt-in: when there's more than one lobby to filter, shows a "Filters"
   *  dropdown of lobby-visibility checkboxes (omitted on the single-lobby view). */
  lobbies?: LobbyDto[];
  hiddenLobbyIds?: number[];
  onToggleLobby?: (lobbyId: number) => void;
}

export const CalendarTopBar = ({
  title,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onNewEvent,
  lobbies,
  hiddenLobbyIds = [],
  onToggleLobby,
}: CalendarTopBarProps) => {
  const showLobbyFilter = lobbies != null && onToggleLobby != null && lobbies.length > 1;
  return (
    <div className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-surface px-8 shadow-[var(--shadow-sm)]">
      {/* Month / week navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="w-40 text-center text-base font-semibold text-text-primary select-none">
          {title}
        </span>
        <button
          onClick={onNext}
          aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Today button */}
      <button
        onClick={onToday}
        className="h-8 rounded-lg border border-border bg-surface px-3 text-sm text-text-secondary hover:bg-surface-hover"
      >
        Today
      </button>

      {/* Week / Month toggle */}
      <div className="flex overflow-hidden rounded-lg border border-border">
        {(['week', 'month'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-4 py-1.5 text-sm font-[inherit] capitalize transition-colors ${
              viewMode === mode
                ? 'bg-brand-green font-semibold text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Lobby filter — hide/show individual lobbies' events, like Google/Outlook's calendar checklists */}
      {showLobbyFilter && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-text-secondary hover:bg-surface-hover">
            <ListFilter className="h-4 w-4" />
            Filters
            {hiddenLobbyIds.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-semibold text-white">
                {hiddenLobbyIds.length}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show lobbies</DropdownMenuLabel>
              {lobbies!.map((lobby) => (
                <DropdownMenuCheckboxItem
                  key={lobby.id}
                  checked={!hiddenLobbyIds.includes(lobby.id)}
                  onCheckedChange={() => onToggleLobby!(lobby.id)}
                  className="gap-2.5"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: lobbyAccentColor(lobby.lobbyType) }}
                  />
                  <span className="truncate">{lobby.name}</span>
                  <span className="ml-auto flex-shrink-0 text-xs text-text-muted">
                    {LOBBY_TYPE_LABELS[lobby.lobbyType]}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* + New event */}
      <button
        onClick={onNewEvent}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:bg-brand-green-dark transition-colors"
      >
        <Plus className="h-4 w-4" />
        New event
      </button>
    </div>
  );
}
