import { useState } from 'react';
import type { DragEvent } from 'react';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto } from '@/features/tasks/model';
import type { UserDto } from '@/features/users/model';
import { formatTaskDueDate } from '@/features/calendar/lib/calendarUtils';
import { getAdjacentStatus, taskDetailsLabel } from '@/features/tasks/lib/taskUtils';
import { LOBBY_TYPE_BADGE_CLASSES } from '@/features/lobby/lib/constants';
import { TASK_PRIORITY_COLORS } from '@/features/tasks/lib/constants';
import { AssigneeAvatar } from '@/components/AssigneeAvatar';
import { KANBAN_LABELS, KANBAN_TEST_IDS } from './kanbanConstants';

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
    <span className={`text-xs ${isUrgent ? 'font-semibold text-red-500' : 'text-text-secondary'}`}>
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
      className={`flex cursor-grab gap-2.5 rounded-lg bg-white p-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:cursor-grabbing ${
        isDone ? 'opacity-75' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <span
        className={`w-1 self-stretch rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            isDone ? 'text-text-muted line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>

        {lobby && (
          <span
            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${LOBBY_TYPE_BADGE_CLASSES[lobby.lobbyType]}`}
          >
            {lobby.name}
          </span>
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
                className="rounded px-1 text-xs text-text-secondary hover:bg-gray-100 disabled:opacity-50"
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
                className="rounded px-1 text-xs text-text-secondary hover:bg-gray-100 disabled:opacity-50"
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
              className="rounded px-1 text-xs text-text-muted hover:bg-red-50 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        </div>

        {moveError && <p className="mt-1.5 text-xs text-red-500">{moveError}</p>}
      </div>
    </div>
  );
};
