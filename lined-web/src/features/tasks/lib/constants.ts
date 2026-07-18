import type { TaskPriority, TaskStatus } from '@/features/tasks/model';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-task-todo',
  IN_PROGRESS: 'bg-task-inprog',
  DONE: 'bg-task-done',
};

export const TASK_STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  TODO: 'bg-task-todo/10 text-task-todo',
  IN_PROGRESS: 'bg-task-inprog/10 text-task-inprog',
  DONE: 'bg-task-done/10 text-task-done',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  HIGH: 'bg-priority-high',
  MEDIUM: 'bg-priority-medium',
  LOW: 'bg-task-done',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  myTasks: ['tasks', 'mine'] as const,
  lobbyTasks: (lobbyId: number) => ['tasks', 'lobby', lobbyId] as const,
} as const;
