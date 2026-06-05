// --- Enums ---

export type LobbyType = 'COUPLE' | 'FAMILY' | 'FRIENDS' | 'WORK';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

// --- User ---

export interface UserDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles: string[];
  activePlan: string | null;
  activeUntil: string | null;
}

export interface UserCreateDto {
  username: string;
  email: string;
  password: string;
  roles?: string[];
}

export interface UserUpdateDto {
  username?: string;
  email?: string;
  password?: string;
  roles?: string[];
}

export interface UserSearchResultDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles: string[];
}

export interface UserPageDto {
  content: UserSearchResultDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// --- Lobby ---

export interface LobbyDto {
  id: number;
  name: string;
  lobbyType: LobbyType;
  ownerId: number;
  memberIds: number[];
}

export interface LobbyCreateDto {
  name: string;
  lobbyType: LobbyType;
}

// --- Task ---

export interface TaskDto {
  id: number;
  title: string;
  status: TaskStatus;
  lobbyId: number;
  creatorId: number;
  assigneeId: number | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TaskCreateDto {
  title: string;
  lobbyId: number;
  assigneeId?: number;
  dueDate?: string;
}

export interface TaskUpdateDto {
  status?: TaskStatus;
  assigneeId?: number;
  dueDate?: string;
  title?: string;
}

// --- Event ---

export interface EventDto {
  id: number;
  title: string;
  shared: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  lobbyId: number;
  ownerId: number;
  createdAt: string;
}

export interface EventCreateDto {
  title: string;
  shared: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  lobbyId: number;
}

export interface EventUpdateDto {
  title?: string;
  shared?: boolean;
  startAt?: string;
  endAt?: string;
  timezone?: string;
}

export interface EventConflictDto {
  first: EventDto;
  second: EventDto;
  overlapStart: string;
  overlapEnd: string;
}

export interface UserConflictDto {
  userId: number;
  hasConflict: boolean;
  conflictingEvent: EventDto | null;
}

// --- Plan ---

export interface PlanDto {
  id: number;
  name: string;
  priceUsd: number;
  durationDays: number;
  createdAt: string;
}

// --- Subscription ---

export interface SubscriptionDto {
  id: number;
  userId: number;
  planId: number;
  planName: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

// --- Role ---

export interface RoleDto {
  id: number;
  name: string;
}
