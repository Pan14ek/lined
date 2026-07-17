import type { LobbyType, TaskPriority, TaskStatus } from '@/types';

export interface LegendItem {
  label: string;
  color: string;
}

export const DEFAULT_LEGEND_ITEMS: LegendItem[] = [
  { label: 'Couple', color: 'var(--color-lobby-couple)' },
  { label: 'Family', color: 'var(--color-lobby-family)' },
  { label: 'Friends', color: 'var(--color-lobby-friends)' },
  { label: 'Work', color: 'var(--color-lobby-work)' },
  { label: 'Free slot', color: 'var(--color-free-slot)' },
];

export const LOBBY_TYPE_LABELS: Record<LobbyType, string> = {
  COUPLE: 'Couple',
  FAMILY: 'Family',
  FRIENDS: 'Friends',
  WORK: 'Work',
};

export const LOBBY_TYPE_COLORS: Record<LobbyType, string> = {
  COUPLE: 'bg-lobby-couple',
  FAMILY: 'bg-lobby-family',
  FRIENDS: 'bg-lobby-friends',
  WORK: 'bg-lobby-work',
};

/** CSS var for a lobby's accent color, e.g. `var(--color-lobby-couple)`. */
export function lobbyAccentColor(lobbyType: LobbyType): string {
  return `var(--color-lobby-${lobbyType.toLowerCase()})`;
}

export const LOBBY_TYPE_BADGE_CLASSES: Record<LobbyType, string> = {
  COUPLE: 'bg-lobby-couple/10 text-lobby-couple',
  FAMILY: 'bg-lobby-family/10 text-lobby-family',
  FRIENDS: 'bg-lobby-friends/10 text-lobby-friends',
  WORK: 'bg-lobby-work/10 text-lobby-work',
};

export const LOBBY_TYPE_BORDER_CLASSES: Record<LobbyType, string> = {
  COUPLE: 'border-lobby-couple',
  FAMILY: 'border-lobby-family',
  FRIENDS: 'border-lobby-friends',
  WORK: 'border-lobby-work',
};

export const LOBBY_TYPE_ICONS: Record<LobbyType, string> = {
  COUPLE: '💑',
  FAMILY: '👨‍👩‍👧‍👦',
  FRIENDS: '🎉',
  WORK: '💼',
};

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

export const QUERY_KEYS = {
  users: ['users'] as const,
  user: (id: number) => ['users', id] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
  lobbies: ['lobbies'] as const,
  lobbyDetail: (id: number) => ['lobbies', id] as const,
  lobbyFreeSlots: (id: number) => ['lobbies', id, 'free-slots'] as const,
  tasks: ['tasks'] as const,
  myTasks: ['tasks', 'mine'] as const,
  lobbyTasks: (lobbyId: number) => ['tasks', 'lobby', lobbyId] as const,
  events: ['events'] as const,
  lobbyInvites: (lobbyId: number) => ['lobby-invites', lobbyId] as const,
  myInvites: ['lobby-invites', 'mine'] as const,
  notificationPreferences: ['notifications', 'preferences'] as const,
  lobbyNotificationPreferences: (lobbyId: number) =>
    ['notifications', 'lobby-preferences', lobbyId] as const,
  myNotifications: ['notifications', 'mine'] as const,
} as const;
