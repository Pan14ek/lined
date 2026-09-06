import { useState } from 'react';
import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto, TaskStatus } from '@/features/tasks/model';
import type { UserPublicDto } from '@/features/users/model';
import { TASK_STATUS_COLORS } from '@/features/tasks/lib/constants';
import { TaskStatusBadge } from '@/features/tasks/TaskStatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { KanbanCard, TASK_DRAG_DATA_FORMAT } from './KanbanCard';
import { KANBAN_TEST_IDS } from './kanbanConstants';
import { cn } from '@/lib/utils';

export interface KanbanMoveState {
  movingTaskId: number | null;
  moveErrors: Record<number, string>;
}

export interface KanbanActions {
  onMove: (task: TaskDto, direction: 'prev' | 'next') => void;
  onDelete: (task: TaskDto) => void;
  onOpen: (task: TaskDto) => void;
  onQuickAdd: (status: TaskStatus) => void;
  onDropTask: (taskId: number, status: TaskStatus) => void;
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskDto[];
  lobbiesById: Map<number, LobbyDto>;
  assigneesById: Map<number, UserPublicDto | undefined>;
  moveState: KanbanMoveState;
  actions: KanbanActions;
}

interface KanbanCardListProps {
  status: TaskStatus;
  tasks: TaskDto[];
  lobbiesById: Map<number, LobbyDto>;
  assigneesById: Map<number, UserPublicDto | undefined>;
  moveState: KanbanMoveState;
  actions: Pick<KanbanActions, 'onMove' | 'onDelete' | 'onOpen'>;
}

/** The column's card stack, or an empty-state message when it has no tasks. */
const KanbanCardList = ({
  status,
  tasks,
  lobbiesById,
  assigneesById,
  moveState,
  actions,
}: KanbanCardListProps) => {
  const { t } = useTranslation('tasks');

  if (tasks.length === 0) {
    return (
      <EmptyState
        variant="inline"
        message={t('kanban.emptyColumn', { status: t(`status.${status}`) })}
      />
    );
  }

  return (
    <>
      {tasks.map((task) => (
        <KanbanCard
          key={task.id}
          task={task}
          lobby={lobbiesById.get(task.lobbyId)}
          assignee={task.assigneeId != null ? assigneesById.get(task.assigneeId) : undefined}
          isMoving={moveState.movingTaskId === task.id}
          moveError={moveState.moveErrors[task.id]}
          onMove={actions.onMove}
          onDelete={actions.onDelete}
          onOpen={actions.onOpen}
        />
      ))}
    </>
  );
};

export const KanbanColumn = ({
  status,
  tasks,
  lobbiesById,
  assigneesById,
  moveState,
  actions,
}: KanbanColumnProps) => {
  const { t } = useTranslation('tasks');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_DATA_FORMAT)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = Number(e.dataTransfer.getData(TASK_DRAG_DATA_FORMAT));
    if (taskId) actions.onDropTask(taskId, status);
  };

  return (
    <div
      className={cn(
        'flex min-w-full flex-1 flex-col snap-center rounded-lg transition-colors md:min-w-[280px] md:snap-align-none',
        isDragOver && 'bg-brand-green-light/60',
      )}
      data-testid={KANBAN_TEST_IDS.column(status)}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', TASK_STATUS_COLORS[status])} />
        <span className="text-sm font-semibold text-text-primary">{t(`status.${status}`)}</span>
        <TaskStatusBadge status={status} size="count">{tasks.length}</TaskStatusBadge>
        <button
          type="button"
          aria-label={t('kanban.addTaskToColumn', { column: t(`status.${status}`) })}
          onClick={() => actions.onQuickAdd(status)}
          className="ml-auto text-lg leading-none text-text-secondary hover:text-brand-green"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <KanbanCardList
          status={status}
          tasks={tasks}
          lobbiesById={lobbiesById}
          assigneesById={assigneesById}
          moveState={moveState}
          actions={actions}
        />
      </div>

      <button
        type="button"
        onClick={() => actions.onQuickAdd(status)}
        className="mt-2.5 w-full rounded-lg border-2 border-dashed border-border py-2 text-xs font-medium text-text-secondary hover:border-brand-green hover:text-brand-green"
      >
        {t('kanban.addTask')}
      </button>
    </div>
  );
};
