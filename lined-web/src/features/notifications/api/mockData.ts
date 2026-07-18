import type { NotificationDto } from '@/features/notifications/model';

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
  {
    id: 3,
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    message: 'You were assigned "Prepare quarterly roadmap deck"',
    lobbyId: 4,
    taskId: 10,
    eventId: null,
    readAt: null,
    createdAt: '2026-07-16T08:00:00Z',
    deliveries: [
      {
        channel: 'IN_APP',
        status: 'DELIVERED',
        queuedAt: '2026-07-16T08:00:00Z',
        deliveredAt: '2026-07-16T08:00:00Z',
      },
    ],
  },
];
