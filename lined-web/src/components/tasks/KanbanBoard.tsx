import { useState } from 'react';
import type { LobbyDto, TaskDto, TaskStatus, UserDto } from '@/types';
import { useMyTasks, useUpdateTaskStatus, useDeleteTask } from '@/hooks/useTasks';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useUsers } from '@/hooks/useUsers';
import { useCreateMenuStore } from '@/store/createMenu';
import { STATUS_ORDER, filterTasks, groupTasksByStatus, type TaskDateFilter } from '@/lib/taskUtils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KanbanColumn } from './KanbanColumn';
import { KanbanFilters } from './KanbanFilters';
import { KANBAN_TEST_IDS, KANBAN_TEXT } from './kanbanConstants';

const SKELETON_COLUMN_COUNT = 3;
const SKELETON_CARDS_PER_COLUMN = 2;

/** Placeholder columns shown while the first `tasks/mine` fetch is in flight. */
const KanbanBoardSkeleton = () => (
  <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3" data-testid={KANBAN_TEST_IDS.loading}>
    {Array.from({ length: SKELETON_COLUMN_COUNT }, (_, columnIndex) => (
      <div key={columnIndex} className="flex flex-col gap-2.5">
        <div className="h-6 w-24 animate-pulse rounded bg-white" />
        {Array.from({ length: SKELETON_CARDS_PER_COLUMN }, (_, cardIndex) => (
          <div key={cardIndex} className="h-20 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
    ))}
  </div>
);

interface KanbanBoardContentProps {
  isLoading: boolean;
  isError: boolean;
  grouped: Record<TaskStatus, TaskDto[]>;
  lobbiesById: Map<number, LobbyDto>;
  assigneesById: Map<number, UserDto | undefined>;
  movingTaskId: number | null;
  moveErrors: Record<number, string>;
  onMove: (task: TaskDto, direction: 'prev' | 'next') => void;
  onDelete: (task: TaskDto) => void;
  onQuickAdd: (status: TaskStatus) => void;
  onDropTask: (taskId: number, status: TaskStatus) => void;
}

/** Loading skeleton, error message, or the 3-column board — whichever applies. */
const KanbanBoardContent = ({
  isLoading,
  isError,
  grouped,
  lobbiesById,
  assigneesById,
  movingTaskId,
  moveErrors,
  onMove,
  onDelete,
  onQuickAdd,
  onDropTask,
}: KanbanBoardContentProps) => {
  if (isLoading) return <KanbanBoardSkeleton />;

  if (isError) {
    return <p className="text-sm text-text-secondary">{KANBAN_TEXT.loadError}</p>;
  }

  return (
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
          onMove={onMove}
          onDelete={onDelete}
          onQuickAdd={onQuickAdd}
          onDropTask={onDropTask}
        />
      ))}
    </div>
  );
};

export const KanbanBoard = () => {
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useMyTasks();
  const { data: lobbies = [] } = useMyLobbies();
  const openOverlay = useCreateMenuStore((s) => s.openOverlay);

  const memberIds = Array.from(new Set(lobbies.flatMap((lobby) => lobby.memberIds)));
  const memberQueries = useUsers(memberIds);
  const members = memberQueries.map((q) => q.data).filter((u): u is UserDto => !!u);
  const assigneesById = new Map(memberIds.map((id, i) => [id, memberQueries[i]?.data]));
  const lobbiesById = new Map(lobbies.map((lobby) => [lobby.id, lobby]));

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
        onError: () => setMoveErrors((prev) => ({ ...prev, [task.id]: KANBAN_TEXT.moveError })),
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

  const handleDelete = (task: TaskDto) => {
    setDeleteError(null);
    setPendingDelete(task);
  };

  const handleQuickAdd = (status: TaskStatus) => openOverlay('task', status);

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    deleteTask.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: () => setDeleteError(KANBAN_TEXT.deleteError),
    });
  };

  const handleDeleteCancel = () => {
    setPendingDelete(null);
    setDeleteError(null);
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
          {KANBAN_TEXT.newTask}
        </button>
      </div>

      <KanbanBoardContent
        isLoading={tasksLoading}
        isError={tasksError}
        grouped={grouped}
        lobbiesById={lobbiesById}
        assigneesById={assigneesById}
        movingTaskId={movingTaskId}
        moveErrors={moveErrors}
        onMove={handleMove}
        onDelete={handleDelete}
        onQuickAdd={handleQuickAdd}
        onDropTask={handleDropTask}
      />

      {pendingDelete && (
        <ConfirmDialog
          title={KANBAN_TEXT.deleteDialogTitle}
          message={`Delete "${pendingDelete.title}"? This can't be undone.`}
          confirmLabel={KANBAN_TEXT.deleteConfirmLabel}
          danger
          isPending={deleteTask.isPending}
          error={deleteError}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};
