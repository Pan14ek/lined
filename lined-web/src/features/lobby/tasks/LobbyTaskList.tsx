import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskDto, TaskStatus } from '@/features/tasks/model';
import type { UserDto } from '@/features/users/model';
import { useLobbyTasks, useUpdateTask } from '@/features/tasks/hooks/useTasks';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useRowMutationState } from '@/hooks/useRowMutationState';
import { useCreateMenuStore } from '@/store/createMenu';
import { TASK_STATUS_LABELS } from '@/features/tasks/lib/constants';
import { sortTasksByDueDate } from '@/features/tasks/lib/taskUtils';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';

type FilterId = 'ALL' | TaskStatus;

const FILTER_IDS: FilterId[] = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'];

interface TaskListContentProps {
  lobbyId: number;
  isLoading: boolean;
  isError: boolean;
  tasks: TaskDto[] | undefined;
  sorted: TaskDto[];
  assigneesById: Map<number, UserDto | undefined>;
  updatingTaskId: number | null;
  rowErrors: Record<number, string>;
  onToggle: (task: TaskDto) => void;
  onOpen: (task: TaskDto) => void;
}

const TaskListContent = ({
  lobbyId,
  isLoading,
  isError,
  tasks,
  sorted,
  assigneesById,
  updatingTaskId,
  rowErrors,
  onToggle,
  onOpen,
}: TaskListContentProps) => {
  const { t } = useTranslation('lobby');

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" data-testid="lobby-tasks-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-text-secondary">{t('tasks.loadError')}</p>
    );
  }

  if (tasks != null && tasks.length === 0) {
    return (
      <EmptyState
        icon="✅"
        message={t('tasks.emptyTitle')}
        action={{ label: t('tasks.inviteSomeone'), to: `/lobbies/${lobbyId}?tab=members` }}
      />
    );
  }

  if (sorted.length === 0) {
    return <EmptyState message={t('tasks.emptyFilterMessage')} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          assignee={task.assigneeId != null ? assigneesById.get(task.assigneeId) : undefined}
          onToggle={onToggle}
          onOpen={onOpen}
          isUpdating={updatingTaskId === task.id}
          updateError={rowErrors[task.id]}
        />
      ))}
    </div>
  );
};

interface LobbyTaskListProps {
  lobbyId: number;
}

export const LobbyTaskList = ({ lobbyId }: LobbyTaskListProps) => {
  const { t } = useTranslation('lobby');
  const { data: tasks, isLoading, isError } = useLobbyTasks(lobbyId);
  const updateTask = useUpdateTask();
  const openOverlay = useCreateMenuStore((s) => s.openOverlay);
  const openTaskDetail = useCreateMenuStore((s) => s.openTaskDetail);
  const [filter, setFilter] = useState<FilterId>('ALL');
  const { busyId: updatingTaskId, errors: rowErrors, start, finish, setError } = useRowMutationState();

  const filterLabel = (id: FilterId): string =>
    id === 'ALL' ? t('tasks.filterAll') : TASK_STATUS_LABELS[id];

  const assigneeIds = Array.from(
    new Set((tasks ?? []).map((t) => t.assigneeId).filter((id): id is number => id != null)),
  );
  const assigneeQueries = useUsers(assigneeIds);
  const assigneesById = new Map(assigneeIds.map((id, i) => [id, assigneeQueries[i]?.data]));

  const counts: Record<FilterId, number> = {
    ALL: tasks?.length ?? 0,
    TODO: tasks?.filter((t) => t.status === 'TODO').length ?? 0,
    IN_PROGRESS: tasks?.filter((t) => t.status === 'IN_PROGRESS').length ?? 0,
    DONE: tasks?.filter((t) => t.status === 'DONE').length ?? 0,
  };

  const filtered = (tasks ?? []).filter((t) => filter === 'ALL' || t.status === filter);
  const sorted = sortTasksByDueDate(filtered);

  const handleToggle = (task: TaskDto) => {
    const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    start(task.id);
    updateTask.mutate(
      { id: task.id, data: { status: nextStatus } },
      {
        onSettled: finish,
        onError: () => setError(task.id, t('tasks.updateError')),
      },
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_IDS.map((filterId) => {
          const isSelected = filter === filterId;
          return (
            <button
              key={filterId}
              type="button"
              onClick={() => setFilter(filterId)}
              aria-pressed={isSelected}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-brand-green text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover',
              )}
            >
              {filterLabel(filterId)} ({counts[filterId]})
            </button>
          );
        })}
        <span className="ml-auto text-xs text-text-secondary">{t('tasks.sortByDueDate')}</span>
      </div>

      <TaskListContent
        lobbyId={lobbyId}
        isLoading={isLoading}
        isError={isError}
        tasks={tasks}
        sorted={sorted}
        assigneesById={assigneesById}
        updatingTaskId={updatingTaskId}
        rowErrors={rowErrors}
        onToggle={handleToggle}
        onOpen={openTaskDetail}
      />

      <button
        type="button"
        onClick={() => openOverlay('task')}
        className="mt-4 w-full rounded-lg border-2 border-dashed border-border py-2.5 text-sm font-medium text-text-secondary hover:border-brand-green hover:text-brand-green"
      >
        {t('tasks.addTask')}
      </button>
    </div>
  );
};
