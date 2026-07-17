import type { LobbyDto, TaskDto, UserDto } from '@/types';
import { formatTaskDueDate } from '@/lib/calendarUtils';
import { getAdjacentStatus } from '@/lib/taskUtils';
import { LOBBY_TYPE_BADGE_CLASSES, TASK_PRIORITY_COLORS } from '@/lib/constants';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface KanbanCardProps {
  task: TaskDto;
  lobby: LobbyDto | undefined;
  assignee: UserDto | undefined;
  isMoving: boolean;
  moveError?: string;
  onMove: (task: TaskDto, direction: 'prev' | 'next') => void;
  onDelete: (task: TaskDto) => void;
}

export const KanbanCard = ({
  task,
  lobby,
  assignee,
  isMoving,
  moveError,
  onMove,
  onDelete,
}: KanbanCardProps) => {
  const isDone = task.status === 'DONE';
  const due = formatTaskDueDate(task.dueDate, task.status);
  const prevStatus = getAdjacentStatus(task.status, 'prev');
  const nextStatus = getAdjacentStatus(task.status, 'next');

  return (
    <div
      data-testid={`kanban-card-${task.id}`}
      className={`flex gap-2.5 rounded-lg bg-white p-3 shadow-[var(--shadow-sm)] ${
        isDone ? 'opacity-75' : ''
      }`}
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
                aria-label={`Move "${task.title}" back`}
                disabled={isMoving}
                onClick={() => onMove(task, 'prev')}
                className="rounded px-1 text-xs text-text-secondary hover:bg-gray-100 disabled:opacity-50"
              >
                ←
              </button>
            )}
            {isDone ? (
              <span
                aria-label="Done"
                className="flex h-4 w-4 items-center justify-center rounded-full bg-task-done text-[10px] text-white"
              >
                ✓
              </span>
            ) : (
              <span
                className={`text-xs ${due.isUrgent ? 'font-semibold text-red-500' : 'text-text-secondary'}`}
              >
                Due: {due.label}
              </span>
            )}
            {nextStatus && (
              <button
                type="button"
                aria-label={`Move "${task.title}" forward`}
                disabled={isMoving}
                onClick={() => onMove(task, 'next')}
                className="rounded px-1 text-xs text-text-secondary hover:bg-gray-100 disabled:opacity-50"
              >
                →
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {assignee ? (
              <Avatar size="sm">
                <AvatarFallback className="bg-brand-green text-[10px] font-semibold text-white">
                  {assignee.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar size="sm">
                <AvatarFallback className="bg-gray-300 text-[10px] font-semibold text-white">
                  ?
                </AvatarFallback>
              </Avatar>
            )}
            <button
              type="button"
              aria-label={`Delete "${task.title}"`}
              onClick={() => onDelete(task)}
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
