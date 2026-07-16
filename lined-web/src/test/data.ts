import type {
  UserDto,
  LobbyDto,
  TaskDto,
  EventDto,
  FreeSlotDto,
  LobbyInviteDto,
  NotificationDto,
} from '@/types';

export const MOCK_USERS: UserDto[] = [
  {
    id: 1,
    username: 'alex_johnson',
    email: 'alex@lined.app',
    createdAt: '2025-01-15T10:00:00Z',
    roles: ['ROLE_USER'],
    activePlan: 'PRO_MONTHLY',
    activeUntil: '2026-05-15T10:00:00Z',
  },
  {
    id: 2,
    username: 'nastia_k',
    email: 'anastasiia@lined.app',
    createdAt: '2025-02-01T12:00:00Z',
    roles: ['ROLE_USER'],
    activePlan: 'PRO_MONTHLY',
    activeUntil: '2026-05-01T12:00:00Z',
  },
];

export const MOCK_LOBBIES: LobbyDto[] = [
  {
    id: 1,
    name: 'Alex & Anastasiia',
    lobbyType: 'COUPLE',
    ownerId: 1,
    memberIds: [1, 2],
  },
  {
    id: 2,
    name: 'Johnson Family',
    lobbyType: 'FAMILY',
    ownerId: 1,
    memberIds: [1, 2],
  },
  {
    id: 3,
    name: 'Weekend Crew',
    lobbyType: 'FRIENDS',
    ownerId: 1,
    memberIds: [1, 2],
  },
];

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);
const dayAfterStr = dayAfter.toISOString().slice(0, 10);
const inThreeDaysStr = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

/** A 3h mutual free window a few days out, used by the dashboard free-slot banner. */
export const MOCK_FREE_SLOT: FreeSlotDto = {
  start: `${inThreeDaysStr}T14:00:00Z`,
  end: `${inThreeDaysStr}T17:00:00Z`,
};

export const MOCK_TASKS: TaskDto[] = [
  {
    id: 1,
    title: 'Plan dinner for Saturday',
    description: 'Pick a restaurant and book a table for two',
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 1,
    creatorId: 1,
    assigneeId: 1,
    dueDate: tomorrowStr,
    createdAt: '2026-04-09T08:00:00Z',
  },
  {
    id: 2,
    title: 'Book restaurant reservation',
    description: null,
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    lobbyId: 1,
    creatorId: 2,
    assigneeId: 1,
    dueDate: todayStr,
    createdAt: '2026-04-08T14:00:00Z',
  },
  {
    id: 3,
    title: 'Buy groceries',
    description: 'Milk, bread, eggs',
    priority: 'LOW',
    status: 'DONE',
    lobbyId: 2,
    creatorId: 1,
    assigneeId: 2,
    dueDate: todayStr,
    createdAt: '2026-04-07T09:00:00Z',
  },
  {
    id: 4,
    title: 'Prepare presentation slides',
    description: null,
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 3,
    creatorId: 1,
    assigneeId: 1,
    dueDate: dayAfterStr,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 5,
    title: 'Send invitations',
    description: null,
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    lobbyId: 3,
    creatorId: 2,
    assigneeId: 2,
    dueDate: tomorrowStr,
    createdAt: '2026-04-09T16:00:00Z',
  },
  {
    id: 6,
    title: 'Clean apartment',
    description: null,
    priority: 'LOW',
    status: 'TODO',
    lobbyId: 2,
    creatorId: 1,
    assigneeId: null,
    dueDate: null,
    createdAt: '2026-04-10T11:00:00Z',
  },
];

export const MOCK_EVENTS: EventDto[] = [
  {
    id: 1,
    title: 'Morning Coffee',
    location: 'Blue Bottle Cafe',
    shared: true,
    startAt: `${todayStr}T09:00:00Z`,
    endAt: `${todayStr}T10:00:00Z`,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 1,
    createdAt: '2026-04-08T08:00:00Z',
  },
  {
    id: 2,
    title: 'Team Lunch',
    location: null,
    shared: true,
    startAt: `${todayStr}T12:00:00Z`,
    endAt: `${todayStr}T13:00:00Z`,
    timezone: 'UTC',
    lobbyId: 3,
    ownerId: 1,
    createdAt: '2026-04-07T10:00:00Z',
  },
  {
    id: 3,
    title: 'Family Dinner',
    location: 'Home',
    shared: true,
    startAt: `${tomorrowStr}T18:00:00Z`,
    endAt: `${tomorrowStr}T20:00:00Z`,
    timezone: 'UTC',
    lobbyId: 2,
    ownerId: 1,
    createdAt: '2026-04-09T09:00:00Z',
  },
  {
    id: 4,
    title: 'Movie Night',
    location: null,
    shared: true,
    startAt: `${tomorrowStr}T20:30:00Z`,
    endAt: `${tomorrowStr}T23:00:00Z`,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 2,
    createdAt: '2026-04-09T11:00:00Z',
  },
  {
    id: 5,
    title: 'Weekend Hike',
    location: 'Blue Ridge Trailhead',
    shared: true,
    startAt: `${dayAfterStr}T08:00:00Z`,
    endAt: `${dayAfterStr}T12:00:00Z`,
    timezone: 'UTC',
    lobbyId: 3,
    ownerId: 1,
    createdAt: '2026-04-10T07:00:00Z',
  },
];

export const MOCK_LOBBY_INVITES: LobbyInviteDto[] = [
  {
    id: 1,
    lobbyId: 3,
    inviterId: 1,
    inviteeId: 2,
    status: 'PENDING',
    sentAt: '2026-07-15T10:00:00Z',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
];

export const MOCK_NOTIFICATIONS: NotificationDto[] = [
  {
    id: 1,
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    message: 'You were assigned "Plan dinner for Saturday"',
    lobbyId: 1,
    taskId: 1,
    eventId: null,
    readAt: null,
    createdAt: '2026-07-15T09:00:00Z',
    deliveries: [
      {
        channel: 'IN_APP',
        status: 'DELIVERED',
        queuedAt: '2026-07-15T09:00:00Z',
        deliveredAt: '2026-07-15T09:00:00Z',
      },
      {
        channel: 'EMAIL',
        status: 'PENDING',
        queuedAt: '2026-07-15T09:00:00Z',
        deliveredAt: null,
      },
    ],
  },
  {
    id: 2,
    type: 'SHARED_EVENT_CREATED',
    title: 'New shared event',
    message: '"Family Dinner" was added to Johnson Family',
    lobbyId: 2,
    taskId: null,
    eventId: 3,
    readAt: '2026-07-15T12:00:00Z',
    createdAt: '2026-07-15T11:00:00Z',
    deliveries: [
      {
        channel: 'IN_APP',
        status: 'DELIVERED',
        queuedAt: '2026-07-15T11:00:00Z',
        deliveredAt: '2026-07-15T11:00:00Z',
      },
    ],
  },
];
