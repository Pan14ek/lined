import type { LobbyDto } from '@/features/lobby/model';
import type { UserDto } from '@/features/users/model';
import type { TaskDateFilter } from '@/features/tasks/lib/taskUtils';
import { KANBAN_LABELS } from './kanbanConstants';

const DATE_FILTER_LABELS: Record<TaskDateFilter, string> = {
  ALL: 'All Dates',
  OVERDUE: 'Overdue',
  THIS_WEEK: 'This Week',
};

const DATE_FILTER_OPTIONS = Object.keys(DATE_FILTER_LABELS) as TaskDateFilter[];

const selectClassName =
  'h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text-secondary focus:border-brand-green focus:outline-none';

const renderMemberOptions = (members: UserDto[]) =>
  members.map((member) => (
    <option key={member.id} value={member.id}>
      {member.username}
    </option>
  ));

const renderDateFilterOptions = () =>
  DATE_FILTER_OPTIONS.map((dateFilterKey) => (
    <option key={dateFilterKey} value={dateFilterKey}>
      {DATE_FILTER_LABELS[dateFilterKey]}
    </option>
  ));

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
  const lobbyOptions = lobbies.map((lobby) => (
    <option key={lobby.id} value={lobby.id}>
      {lobby.name}
    </option>
  ));

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={KANBAN_LABELS.filterByLobby}
        value={lobbyId ?? ''}
        onChange={(e) => onLobbyChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={selectClassName}
      >
        <option value="">All Lobbies</option>
        {lobbyOptions}
      </select>

      <select
        aria-label={KANBAN_LABELS.filterByMember}
        value={memberId ?? ''}
        onChange={(e) => onMemberChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={selectClassName}
      >
        <option value="">All Members</option>
        {renderMemberOptions(members)}
      </select>

      <select
        aria-label={KANBAN_LABELS.filterByDate}
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value as TaskDateFilter)}
        className={selectClassName}
      >
        {renderDateFilterOptions()}
      </select>
    </div>
  );
};
