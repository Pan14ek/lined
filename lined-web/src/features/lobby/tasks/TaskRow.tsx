import { useTranslation } from 'react-i18next';
import type { TaskDto } from '@/features/tasks/model';
import type { UserDto } from '@/features/users/model';
import { formatTaskDueDate } from '@/features/calendar/lib/calendarUtils';
import { taskDetailsLabel } from '@/features/tasks/lib/taskUtils';
import { TaskStatusBadge } from '@/features/tasks/TaskStatusBadge';
import { AssigneeAvatar } from '@/components/AssigneeAvatar';
import { cn } from '@/lib/utils';

interface TaskRowProps {
  task: TaskDto;
  assignee: UserDto | undefined;
  onToggle: (task: TaskDto) => void;
  isUpdating: boolean;
  updateError?: string;
  /** Opens the task-detail/edit drawer for this task. Omitted where no detail view exists yet. */
  onOpen?: (task: TaskDto) => void;
}

export const TaskRow = ({ task, assignee, onToggle, isUpdating, updateError, onOpen }: TaskRowProps) => {
  const { t } = useTranslation('lobby');
  const isDone = task.status === 'DONE';
  const due = formatTaskDueDate(task.dueDate, task.status);

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? taskDetailsLabel(task.title) : undefined}
      onClick={onOpen ? () => onOpen(task) : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(task);
              }
            }
          : undefined
      }
      className={cn(
        'flex items-center gap-4 rounded-lg bg-surface p-4 shadow-[var(--shadow-sm)]',
        isDone && 'opacity-70',
        onOpen && 'cursor-pointer hover:shadow-[var(--shadow-md)]',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={
          isDone
            ? t('tasks.markAsToDo', { title: task.title })
            : t('tasks.markAsDone', { title: task.title })
        }
        disabled={isUpdating}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 text-xs text-white disabled:opacity-50',
          isDone ? 'border-task-done bg-task-done' : 'border-border bg-surface',
        )}
      >
        {isDone && '✓'}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn('text-sm font-medium', isDone ? 'text-text-muted line-through' : 'text-text-primary')}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-text-secondary">{task.description}</p>
        )}
        {updateError && <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">{updateError}</p>}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <TaskStatusBadge status={task.status} />
        <AssigneeAvatar assignee={assignee} size="sm" />
        <span
          className={cn(
            'w-16 text-right text-xs',
            due.isUrgent ? 'font-semibold text-red-500 dark:text-red-400' : isDone ? 'text-text-muted' : 'text-text-secondary',
          )}
        >
          {due.label}
        </span>
      </div>
    </div>
  );
};
