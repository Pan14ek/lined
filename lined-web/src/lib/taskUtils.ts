import type { TaskDto, TaskStatus } from '@/types';
import { addDays, getWeekStart } from './calendarUtils';

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

/** Adjacent status in `STATUS_ORDER`, or `undefined` at either end. */
export function getAdjacentStatus(
  status: TaskStatus,
  direction: 'prev' | 'next',
): TaskStatus | undefined {
  const index = STATUS_ORDER.indexOf(status);
  const nextIndex = direction === 'next' ? index + 1 : index - 1;
  return STATUS_ORDER[nextIndex];
}

export function groupTasksByStatus(tasks: TaskDto[]): Record<TaskStatus, TaskDto[]> {
  const groups: Record<TaskStatus, TaskDto[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const task of tasks) {
    groups[task.status].push(task);
  }
  return groups;
}

export function isTaskOverdue(task: TaskDto, today: Date = new Date()): boolean {
  if (task.status === 'DONE' || !task.dueDate) return false;
  const dueStr = task.dueDate.slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  return dueStr < todayStr;
}

export function isTaskDueThisWeek(task: TaskDto, today: Date = new Date()): boolean {
  if (!task.dueDate) return false;
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 7);
  const due = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`);
  return due >= weekStart && due < weekEnd;
}

export type TaskDateFilter = 'ALL' | 'OVERDUE' | 'THIS_WEEK';

export interface TaskFilters {
  lobbyId?: number;
  memberId?: number;
  dateFilter?: TaskDateFilter;
}

/** Pure client-side filter over the merged "my tasks" list. */
export function filterTasks(
  tasks: TaskDto[],
  filters: TaskFilters,
  today: Date = new Date(),
): TaskDto[] {
  const { lobbyId, memberId, dateFilter = 'ALL' } = filters;
  return tasks.filter((task) => {
    if (lobbyId != null && task.lobbyId !== lobbyId) return false;
    if (memberId != null && task.assigneeId !== memberId) return false;
    if (dateFilter === 'OVERDUE' && !isTaskOverdue(task, today)) return false;
    if (dateFilter === 'THIS_WEEK' && !isTaskDueThisWeek(task, today)) return false;
    return true;
  });
}
