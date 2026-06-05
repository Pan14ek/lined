import type { UserDto, LobbyDto, TaskDto, EventDto } from '@/types';

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

export const MOCK_TASKS: TaskDto[] = [
  {
    id: 1,
    title: 'Plan dinner for Saturday',
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
    shared: true,
    startAt: `${dayAfterStr}T08:00:00Z`,
    endAt: `${dayAfterStr}T12:00:00Z`,
    timezone: 'UTC',
    lobbyId: 3,
    ownerId: 1,
    createdAt: '2026-04-10T07:00:00Z',
  },
];
