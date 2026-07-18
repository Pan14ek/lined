import type { TaskDto, TaskStatus } from '@/features/tasks/model';
import { addDays, getWeekStart, toLocalDateString } from '@/features/calendar/lib/calendarUtils';

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

/** Accessible name for the click-to-open-details affordance on a task row/card. */
export const taskDetailsLabel = (title: string): string => `View details for "${title}"`;

/** Adjacent status in `STATUS_ORDER`, or `undefined` at either end. */
export const getAdjacentStatus = (
  status: TaskStatus,
  direction: 'prev' | 'next',
): TaskStatus | undefined => {
  const index = STATUS_ORDER.indexOf(status);
  const nextIndex = direction === 'next' ? index + 1 : index - 1;
  return STATUS_ORDER[nextIndex];
};

/** Not-done tasks first, then ascending by due date (tasks with no due date last). */
export const sortTasksByDueDate = (tasks: TaskDto[]): TaskDto[] =>
  [...tasks].sort((a, b) => {
    if ((a.status === 'DONE') !== (b.status === 'DONE')) {
      return a.status === 'DONE' ? 1 : -1;
    }
    if (a.dueDate == null && b.dueDate == null) return 0;
    if (a.dueDate == null) return 1;
    if (b.dueDate == null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

export const groupTasksByStatus = (tasks: TaskDto[]): Record<TaskStatus, TaskDto[]> => {
  const groups: Record<TaskStatus, TaskDto[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const task of tasks) {
    groups[task.status].push(task);
  }
  return groups;
};

export const isTaskOverdue = (task: TaskDto, today: Date = new Date()): boolean => {
  if (task.status === 'DONE' || !task.dueDate) return false;
  const dueStr = task.dueDate.slice(0, 10);
  const todayStr = toLocalDateString(today);
  return dueStr < todayStr;
};

export const isTaskDueThisWeek = (task: TaskDto, today: Date = new Date()): boolean => {
  if (!task.dueDate) return false;
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 7);
  const due = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`);
  return due >= weekStart && due < weekEnd;
};

export type TaskDateFilter = 'ALL' | 'OVERDUE' | 'THIS_WEEK';

export interface TaskFilters {
  lobbyId?: number;
  memberId?: number;
  dateFilter?: TaskDateFilter;
}

/** Pure client-side filter over the merged "my tasks" list. */
export const filterTasks = (
  tasks: TaskDto[],
  filters: TaskFilters,
  today: Date = new Date(),
): TaskDto[] => {
  const { lobbyId, memberId, dateFilter = 'ALL' } = filters;
  return tasks.filter((task) => {
    if (lobbyId != null && task.lobbyId !== lobbyId) return false;
    if (memberId != null && task.assigneeId !== memberId) return false;
    if (dateFilter === 'OVERDUE' && !isTaskOverdue(task, today)) return false;
    if (dateFilter === 'THIS_WEEK' && !isTaskDueThisWeek(task, today)) return false;
    return true;
  });
};
