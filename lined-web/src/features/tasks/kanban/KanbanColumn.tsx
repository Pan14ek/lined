import { useState } from 'react';
import type { DragEvent } from 'react';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto, TaskStatus } from '@/features/tasks/model';
import type { UserDto } from '@/features/users/model';
import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/features/tasks/lib/constants';
import { EmptyState } from '@/components/EmptyState';
import { KanbanCard, TASK_DRAG_DATA_FORMAT } from './KanbanCard';
import { KANBAN_LABELS, KANBAN_TEST_IDS, KANBAN_TEXT } from './kanbanConstants';

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
  assigneesById: Map<number, UserDto | undefined>;
  moveState: KanbanMoveState;
  actions: KanbanActions;
}

interface KanbanCardListProps {
  status: TaskStatus;
  tasks: TaskDto[];
  lobbiesById: Map<number, LobbyDto>;
  assigneesById: Map<number, UserDto | undefined>;
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
  if (tasks.length === 0) {
    return <EmptyState variant="inline" message={`No tasks in ${TASK_STATUS_LABELS[status]}.`} />;
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
      className={`flex min-w-full flex-1 flex-col snap-center rounded-lg transition-colors md:min-w-[280px] md:snap-align-none ${
        isDragOver ? 'bg-brand-green-light/60' : ''
      }`}
      data-testid={KANBAN_TEST_IDS.column(status)}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${TASK_STATUS_COLORS[status]}`} />
        <span className="text-sm font-semibold text-text-primary">{TASK_STATUS_LABELS[status]}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TASK_STATUS_BADGE_CLASSES[status]}`}
        >
          {tasks.length}
        </span>
        <button
          type="button"
          aria-label={KANBAN_LABELS.addTaskToColumn(TASK_STATUS_LABELS[status])}
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
        {KANBAN_TEXT.addTask}
      </button>
    </div>
  );
};
