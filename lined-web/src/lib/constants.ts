import type { LobbyType, TaskStatus } from '@/types';

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

export const QUERY_KEYS = {
  users: ['users'] as const,
  user: (id: number) => ['users', id] as const,
  lobbies: ['lobbies'] as const,
  lobbyDetail: (id: number) => ['lobbies', id] as const,
  lobbyFreeSlots: (id: number) => ['lobbies', id, 'free-slots'] as const,
  tasks: ['tasks'] as const,
  myTasks: ['tasks', 'mine'] as const,
  events: ['events'] as const,
  lobbyInvites: (lobbyId: number) => ['lobby-invites', lobbyId] as const,
  myInvites: ['lobby-invites', 'mine'] as const,
  notificationPreferences: ['notifications', 'preferences'] as const,
  lobbyNotificationPreferences: (lobbyId: number) =>
    ['notifications', 'lobby-preferences', lobbyId] as const,
  myNotifications: ['notifications', 'mine'] as const,
} as const;
