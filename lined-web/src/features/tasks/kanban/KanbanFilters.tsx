import { useTranslation } from 'react-i18next';
import type { LobbyDto } from '@/features/lobby/model';
import type { UserPublicDto } from '@/features/users/model';
import type { TaskDateFilter } from '@/features/tasks/lib/taskUtils';

const selectClassName =
  'h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text-secondary focus:border-brand-green focus:outline-none';

const renderMemberOptions = (members: UserPublicDto[]) =>
  members.map((member) => (
    <option key={member.id} value={member.id}>
      {member.username}
    </option>
  ));

interface KanbanFiltersProps {
  lobbies: LobbyDto[];
  members: UserPublicDto[];
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
  const { t } = useTranslation('tasks');

  const dateFilterLabels: Record<TaskDateFilter, string> = {
    ALL: t('kanban.allDates'),
    OVERDUE: t('kanban.overdue'),
    THIS_WEEK: t('kanban.thisWeek'),
  };
  const dateFilterOptions = Object.keys(dateFilterLabels) as TaskDateFilter[];

  const lobbyOptions = lobbies.map((lobby) => (
    <option key={lobby.id} value={lobby.id}>
      {lobby.name}
    </option>
  ));

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={t('kanban.filterByLobby')}
        value={lobbyId ?? ''}
        onChange={(e) => onLobbyChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={selectClassName}
      >
        <option value="">{t('kanban.allLobbies')}</option>
        {lobbyOptions}
      </select>

      <select
        aria-label={t('kanban.filterByMember')}
        value={memberId ?? ''}
        onChange={(e) => onMemberChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={selectClassName}
      >
        <option value="">{t('kanban.allMembers')}</option>
        {renderMemberOptions(members)}
      </select>

      <select
        aria-label={t('kanban.filterByDate')}
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value as TaskDateFilter)}
        className={selectClassName}
      >
        {dateFilterOptions.map((dateFilterKey) => (
          <option key={dateFilterKey} value={dateFilterKey}>
            {dateFilterLabels[dateFilterKey]}
          </option>
        ))}
      </select>
    </div>
  );
};
