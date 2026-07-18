import { useState } from 'react';
import type { DragEvent } from 'react';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto } from '@/features/tasks/model';
import type { UserDto } from '@/features/users/model';
import { formatTaskDueDate } from '@/features/calendar/lib/calendarUtils';
import { getAdjacentStatus, taskDetailsLabel } from '@/features/tasks/lib/taskUtils';
import { LobbyTypeBadge } from '@/features/lobby/LobbyTypeBadge';
import { TASK_PRIORITY_COLORS } from '@/features/tasks/lib/constants';
import { AssigneeAvatar } from '@/components/AssigneeAvatar';
import { KANBAN_LABELS, KANBAN_TEST_IDS } from './kanbanConstants';
import { cn } from '@/lib/utils';

export const TASK_DRAG_DATA_FORMAT = 'application/x-lined-task-id';

interface KanbanCardProps {
  task: TaskDto;
  lobby: LobbyDto | undefined;
  assignee: UserDto | undefined;
  isMoving: boolean;
  moveError?: string;
  onMove: (task: TaskDto, direction: 'prev' | 'next') => void;
  onDelete: (task: TaskDto) => void;
  onOpen: (task: TaskDto) => void;
}

interface DueDateOrDoneIndicatorProps {
  isDone: boolean;
  dueLabel: string;
  isUrgent: boolean;
}

/** Shows a due-date label, or a green checkmark badge once the task is done. */
const DueDateOrDoneIndicator = ({ isDone, dueLabel, isUrgent }: DueDateOrDoneIndicatorProps) => {
  if (isDone) {
    return (
      <span
        aria-label={KANBAN_LABELS.doneBadge}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-task-done text-[10px] text-white"
      >
        ✓
      </span>
    );
  }

  return (
    <span className={cn('text-xs', isUrgent ? 'font-semibold text-red-500 dark:text-red-400' : 'text-text-secondary')}>
      Due: {dueLabel}
    </span>
  );
};

export const KanbanCard = ({
  task,
  lobby,
  assignee,
  isMoving,
  moveError,
  onMove,
  onDelete,
  onOpen,
}: KanbanCardProps) => {
  const isDone = task.status === 'DONE';
  const due = formatTaskDueDate(task.dueDate, task.status);
  const prevStatus = getAdjacentStatus(task.status, 'prev');
  const nextStatus = getAdjacentStatus(task.status, 'next');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(TASK_DRAG_DATA_FORMAT, String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  return (
    <div
      data-testid={KANBAN_TEST_IDS.card(task.id)}
      role="button"
      tabIndex={0}
      aria-label={taskDetailsLabel(task.title)}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        'flex cursor-grab gap-2.5 rounded-lg bg-surface p-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:cursor-grabbing',
        isDone && 'opacity-75',
        isDragging && 'opacity-40',
      )}
    >
      <span
        className={cn('w-1 self-stretch rounded-full', TASK_PRIORITY_COLORS[task.priority])}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn('text-sm font-medium', isDone ? 'text-text-muted line-through' : 'text-text-primary')}
        >
          {task.title}
        </p>

        {lobby && (
          <LobbyTypeBadge type={lobby.lobbyType} size="compact" className="mt-1.5 inline-block">
            {lobby.name}
          </LobbyTypeBadge>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {prevStatus && (
              <button
                type="button"
                aria-label={KANBAN_LABELS.moveBack(task.title)}
                disabled={isMoving}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(task, 'prev');
                }}
                className="flex min-h-11 min-w-11 items-center justify-center rounded text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50 md:min-h-0 md:min-w-0 md:px-1"
              >
                ←
              </button>
            )}
            <DueDateOrDoneIndicator isDone={isDone} dueLabel={due.label} isUrgent={due.isUrgent} />
            {nextStatus && (
              <button
                type="button"
                aria-label={KANBAN_LABELS.moveForward(task.title)}
                disabled={isMoving}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(task, 'next');
                }}
                className="flex min-h-11 min-w-11 items-center justify-center rounded text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50 md:min-h-0 md:min-w-0 md:px-1"
              >
                →
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <AssigneeAvatar assignee={assignee} size="sm" fallbackTextClassName="text-[10px]" />
            <button
              type="button"
              aria-label={KANBAN_LABELS.deleteTask(task.title)}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              className="rounded px-1 text-xs text-text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              ✕
            </button>
          </div>
        </div>

        {moveError && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{moveError}</p>}
      </div>
    </div>
  );
};
