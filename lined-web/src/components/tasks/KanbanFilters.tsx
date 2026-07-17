import type { LobbyDto, UserDto } from '@/types';
import type { TaskDateFilter } from '@/lib/taskUtils';

const DATE_FILTER_LABELS: Record<TaskDateFilter, string> = {
  ALL: 'All Dates',
  OVERDUE: 'Overdue',
  THIS_WEEK: 'This Week',
};

const selectClassName =
  'h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium text-text-secondary focus:border-brand-green focus:outline-none';

interface KanbanFiltersProps {
  lobbies: LobbyDto[];
  members: UserDto[];
  lobbyId: number | undefined;
  memberId: number | undefined;
  dateFilter: TaskDateFilter;
  onLobbyChange: (lobbyId: number | undefined) => void;
  onMemberChange: (memberId: number | undefined) => void;
  onDateFilterChange: (dateFilter: TaskDateFilter) => void;
}

export const KanbanFilters = ({
  lobbies,
  members,
  lobbyId,
  memberId,
  dateFilter,
  onLobbyChange,
  onMemberChange,
  onDateFilterChange,
}: KanbanFiltersProps) => {
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Filter by lobby"
        value={lobbyId ?? ''}
        onChange={(e) => onLobbyChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={selectClassName}
      >
        <option value="">All Lobbies</option>
        {lobbies.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by member"
        value={memberId ?? ''}
        onChange={(e) => onMemberChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={selectClassName}
      >
        <option value="">All Members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.username}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by date"
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value as TaskDateFilter)}
        className={selectClassName}
      >
        {(Object.keys(DATE_FILTER_LABELS) as TaskDateFilter[]).map((key) => (
          <option key={key} value={key}>
            {DATE_FILTER_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
};
