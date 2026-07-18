import type { TaskStatus } from '@/features/tasks/model';

/** `data-testid` builders, shared between the kanban components and their tests. */
export const KANBAN_TEST_IDS = {
  loading: 'kanban-loading',
  column: (status: TaskStatus) => `kanban-column-${status}`,
  card: (taskId: number) => `kanban-card-${taskId}`,
};

/** Accessible-name builders for `aria-label`/role queries, shared with tests. */
export const KANBAN_LABELS = {
  moveBack: (title: string) => `Move "${title}" back`,
  moveForward: (title: string) => `Move "${title}" forward`,
  deleteTask: (title: string) => `Delete "${title}"`,
  addTaskToColumn: (columnLabel: string) => `Add task to ${columnLabel}`,
  doneBadge: 'Done',
  filterByLobby: 'Filter by lobby',
  filterByMember: 'Filter by member',
  filterByDate: 'Filter by date',
};

/** Static copy shared between the kanban components and their tests. */
export const KANBAN_TEXT = {
  loadError: "Couldn't load your tasks. Try again later.",
  moveError: "Couldn't move — try again",
  deleteError: "Couldn't delete this task — please try again",
  deleteDialogTitle: 'Delete task',
  deleteConfirmLabel: 'Delete',
  newTask: '+ New task',
  addTask: '+ Add task',
};
