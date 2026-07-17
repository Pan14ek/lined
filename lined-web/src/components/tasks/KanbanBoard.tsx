import { useState } from 'react';
import type { TaskDto, TaskStatus, UserDto } from '@/types';
import { useMyTasks, useUpdateTaskStatus, useDeleteTask } from '@/hooks/useTasks';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useUsers } from '@/hooks/useUsers';
import { useCreateMenuStore } from '@/store/createMenu';
import { STATUS_ORDER, filterTasks, groupTasksByStatus, type TaskDateFilter } from '@/lib/taskUtils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KanbanColumn } from './KanbanColumn';
import { KanbanFilters } from './KanbanFilters';

export const KanbanBoard = () => {
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useMyTasks();
  const { data: lobbies = [] } = useMyLobbies();
  const openOverlay = useCreateMenuStore((s) => s.openOverlay);

  const memberIds = Array.from(new Set(lobbies.flatMap((l) => l.memberIds)));
  const memberQueries = useUsers(memberIds);
  const members = memberQueries.map((q) => q.data).filter((u): u is UserDto => !!u);
  const assigneesById = new Map(memberIds.map((id, i) => [id, memberQueries[i]?.data]));
  const lobbiesById = new Map(lobbies.map((l) => [l.id, l]));

  const [lobbyId, setLobbyId] = useState<number | undefined>(undefined);
  const [memberId, setMemberId] = useState<number | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<TaskDateFilter>('ALL');

  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
  const [moveErrors, setMoveErrors] = useState<Record<number, string>>({});
  const [pendingDelete, setPendingDelete] = useState<TaskDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const filtered = filterTasks(tasks ?? [], { lobbyId, memberId, dateFilter });
  const grouped = groupTasksByStatus(filtered);

  const moveTaskToStatus = (task: TaskDto, nextStatus: TaskStatus) => {
    if (nextStatus === task.status) return;

    setMovingTaskId(task.id);
    setMoveErrors((prev) => {
      if (!(task.id in prev)) return prev;
      const next = { ...prev };
      delete next[task.id];
      return next;
    });

    updateTaskStatus.mutate(
      { id: task.id, status: nextStatus },
      {
        onSettled: () => setMovingTaskId(null),
        onError: () =>
          setMoveErrors((prev) => ({ ...prev, [task.id]: "Couldn't move — try again" })),
      },
    );
  };

  const handleMove = (task: TaskDto, direction: 'prev' | 'next') => {
    const nextStatus: TaskStatus | undefined =
      STATUS_ORDER[STATUS_ORDER.indexOf(task.status) + (direction === 'next' ? 1 : -1)];
    if (!nextStatus) return;
    moveTaskToStatus(task, nextStatus);
  };

  const handleDropTask = (taskId: number, status: TaskStatus) => {
    const task = (tasks ?? []).find((t) => t.id === taskId);
    if (!task) return;
    moveTaskToStatus(task, status);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    deleteTask.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: () => setDeleteError("Couldn't delete this task — please try again"),
    });
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">All Tasks</h1>
        <KanbanFilters
          lobbies={lobbies}
          members={members}
          lobbyId={lobbyId}
          memberId={memberId}
          dateFilter={dateFilter}
          onLobbyChange={setLobbyId}
          onMemberChange={setMemberId}
          onDateFilterChange={setDateFilter}
        />
        <button
          type="button"
          onClick={() => openOverlay('task')}
          className="ml-auto h-9 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          + New task
        </button>
      </div>

      {tasksLoading && (
        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3" data-testid="kanban-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="h-6 w-24 animate-pulse rounded bg-white" />
              {[0, 1].map((j) => (
                <div key={j} className="h-20 animate-pulse rounded-lg bg-white" />
              ))}
            </div>
          ))}
        </div>
      )}

      {!tasksLoading && tasksError && (
        <p className="text-sm text-text-secondary">Couldn&apos;t load your tasks. Try again later.</p>
      )}

      {!tasksLoading && !tasksError && (
        <div className="flex flex-1 flex-col gap-6 overflow-x-auto md:flex-row">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={grouped[status]}
              lobbiesById={lobbiesById}
              assigneesById={assigneesById}
              movingTaskId={movingTaskId}
              moveErrors={moveErrors}
              onMove={handleMove}
              onDelete={(task) => {
                setDeleteError(null);
                setPendingDelete(task);
              }}
              onQuickAdd={(status) => openOverlay('task', status)}
              onDropTask={handleDropTask}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${pendingDelete.title}"? This can't be undone.`}
          confirmLabel="Delete"
          danger
          isPending={deleteTask.isPending}
          error={deleteError}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setPendingDelete(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
};
