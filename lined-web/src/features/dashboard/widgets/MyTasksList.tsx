import { Link } from 'react-router-dom';
import type { TaskDto } from '@/features/tasks/model';
import { TASK_STATUS_COLORS } from '@/features/tasks/lib/constants';
import { formatTaskDueDate } from '@/features/calendar/lib/calendarUtils';
import { sortTasksByDueDate } from '@/features/tasks/lib/taskUtils';
import { EmptyState } from '@/components/EmptyState';
import { TaskStatusBadge } from '@/features/tasks/TaskStatusBadge';
import { cn } from '@/lib/utils';

const MAX_TASKS_SHOWN = 5;

const sortTasks = (tasks: TaskDto[]): TaskDto[] => {
  return sortTasksByDueDate(tasks).slice(0, MAX_TASKS_SHOWN);
}

interface MyTasksListProps {
  tasks: TaskDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const MyTasksList = ({ tasks, isLoading, isError }: MyTasksListProps) => {
  const sorted = tasks ? sortTasks(tasks) : [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">My Tasks</h2>
        <Link to="/tasks" className="text-xs font-medium text-brand-green">
          All tasks →
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2" data-testid="my-tasks-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-text-secondary">
          Couldn&apos;t load your tasks. Try again later.
        </p>
      )}

      {!isLoading && !isError && tasks?.length === 0 && (
        <EmptyState
          icon="✅"
          message="No tasks yet — tasks you create or get assigned will appear here."
        />
      )}

      {!isLoading && !isError && tasks != null && tasks.length > 0 && (
        <div className="flex flex-col gap-2">
          {sorted.map((task) => {
            const due = formatTaskDueDate(task.dueDate, task.status);
            const isDone = task.status === 'DONE';
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-[var(--shadow-sm)]"
              >
                <span
                  className={cn('h-2 w-2 flex-shrink-0 rounded-full', TASK_STATUS_COLORS[task.status])}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      isDone ? 'text-text-muted line-through' : 'text-text-primary',
                    )}
                  >
                    {task.title}
                  </p>
                  <TaskStatusBadge status={task.status} />
                </div>
                <span
                  className={cn(
                    'flex-shrink-0 text-xs',
                    due.isUrgent
                      ? 'font-semibold text-red-500 dark:text-red-400'
                      : isDone
                        ? 'text-text-muted'
                        : 'text-text-secondary',
                  )}
                >
                  {due.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
