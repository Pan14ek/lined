import { useState } from 'react';
import type { TaskDto, TaskStatus, UserDto } from '@/types';
import { useLobbyTasks, useUpdateTask } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { useRowMutationState } from '@/hooks/useRowMutationState';
import { useCreateMenuStore } from '@/store/createMenu';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import { TaskRow } from './TaskRow';

type FilterId = 'ALL' | TaskStatus;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'TODO', label: TASK_STATUS_LABELS.TODO },
  { id: 'IN_PROGRESS', label: TASK_STATUS_LABELS.IN_PROGRESS },
  { id: 'DONE', label: TASK_STATUS_LABELS.DONE },
];

const sortByDueDate = (tasks: TaskDto[]): TaskDto[] =>
  [...tasks].sort((a, b) => {
    if ((a.status === 'DONE') !== (b.status === 'DONE')) {
      return a.status === 'DONE' ? 1 : -1;
    }
    if (a.dueDate == null && b.dueDate == null) return 0;
    if (a.dueDate == null) return 1;
    if (b.dueDate == null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

interface TaskListContentProps {
  isLoading: boolean;
  isError: boolean;
  tasks: TaskDto[] | undefined;
  sorted: TaskDto[];
  assigneesById: Map<number, UserDto | undefined>;
  updatingTaskId: number | null;
  rowErrors: Record<number, string>;
  onToggle: (task: TaskDto) => void;
}

const TaskListContent = ({
  isLoading,
  isError,
  tasks,
  sorted,
  assigneesById,
  updatingTaskId,
  rowErrors,
  onToggle,
}: TaskListContentProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" data-testid="lobby-tasks-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-text-secondary">Couldn&apos;t load tasks. Try again later.</p>
    );
  }

  if (tasks != null && tasks.length === 0) {
    return <p className="text-sm text-text-secondary">No tasks yet.</p>;
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-text-secondary">No tasks match this filter.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          assignee={task.assigneeId != null ? assigneesById.get(task.assigneeId) : undefined}
          onToggle={onToggle}
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
  const { data: tasks, isLoading, isError } = useLobbyTasks(lobbyId);
  const updateTask = useUpdateTask(lobbyId);
  const openOverlay = useCreateMenuStore((s) => s.openOverlay);
  const [filter, setFilter] = useState<FilterId>('ALL');
  const { busyId: updatingTaskId, errors: rowErrors, start, finish, setError } = useRowMutationState();

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
  const sorted = sortByDueDate(filtered);

  const handleToggle = (task: TaskDto) => {
    const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    start(task.id);
    updateTask.mutate(
      { id: task.id, data: { status: nextStatus } },
      {
        onSettled: finish,
        onError: () => setError(task.id, "Couldn't update — try again"),
      },
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-brand-green text-white'
                : 'bg-white text-text-secondary hover:bg-gray-50'
            }`}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
        <span className="ml-auto text-xs text-text-secondary">Sort: Due date</span>
      </div>

      <TaskListContent
        isLoading={isLoading}
        isError={isError}
        tasks={tasks}
        sorted={sorted}
        assigneesById={assigneesById}
        updatingTaskId={updatingTaskId}
        rowErrors={rowErrors}
        onToggle={handleToggle}
      />

      <button
        type="button"
        onClick={() => openOverlay('task')}
        className="mt-4 w-full rounded-lg border-2 border-dashed border-border py-2.5 text-sm font-medium text-text-secondary hover:border-brand-green hover:text-brand-green"
      >
        + Add task
      </button>
    </div>
  );
};
