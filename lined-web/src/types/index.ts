// --- Enums ---

export type LobbyType = 'COUPLE' | 'FAMILY' | 'FRIENDS' | 'WORK';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type LobbyInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export type NotificationType = 'TASK_ASSIGNED' | 'SHARED_EVENT_CREATED';

export type NotificationDeliveryChannel = 'IN_APP' | 'EMAIL' | 'PUSH';

export type NotificationDeliveryStatus = 'PENDING' | 'DELIVERED';

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

export interface LobbyUpdateDto {
  name?: string;
  lobbyType?: LobbyType;
  ownerId?: number;
}

export interface FreeSlotDto {
  start: string;
  end: string;
}

// --- Lobby invite ---

export interface LobbyInviteDto {
  id: number;
  lobbyId: number;
  inviterId: number;
  inviteeId: number;
  status: LobbyInviteStatus;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

// --- Task ---

export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
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
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  notifyAssignee?: boolean;
}

export interface TaskUpdateDto {
  status?: TaskStatus;
  assigneeId?: number;
  dueDate?: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
}

// --- Event ---

export interface EventDto {
  id: number;
  title: string;
  location: string | null;
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
  location?: string;
  shared: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  lobbyId: number;
  notifyMembers?: boolean;
}

export interface EventUpdateDto {
  title?: string;
  /** Omit to keep the current location; send '' to clear it. */
  location?: string;
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

export interface SubscriptionCreateDto {
  userId: number;
  planId: number;
}

// --- Role ---

export interface RoleDto {
  id: number;
  name: string;
}

// --- Auth ---

export interface LoginRequestDto {
  identifier: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  username: string;
  email: string;
  roles: string[];
}

// --- Notifications ---

export interface NotificationPreferencesDto {
  sharedEventsEnabled: boolean;
  taskAssignedEnabled: boolean;
  freeSlotsEnabled: boolean;
  eventRemindersEnabled: boolean;
  emailDigestsEnabled: boolean;
}

export type NotificationPreferencesUpdateDto = Partial<NotificationPreferencesDto>;

export interface LobbyNotificationPreferencesDto {
  lobbyId: number;
  newEventsEnabled: boolean;
  taskUpdatesEnabled: boolean;
  freeSlotsEnabled: boolean;
}

export type LobbyNotificationPreferencesUpdateDto = Partial<
  Omit<LobbyNotificationPreferencesDto, 'lobbyId'>
>;

export interface NotificationDeliveryDto {
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  queuedAt: string;
  deliveredAt: string | null;
}

export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  lobbyId: number | null;
  taskId: number | null;
  eventId: number | null;
  readAt: string | null;
  createdAt: string;
  deliveries: NotificationDeliveryDto[];
}
