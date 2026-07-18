import { authHandlers } from '@/features/auth/api/handlers';
import { userHandlers } from '@/features/users/api/handlers';
import { lobbyHandlers } from '@/features/lobby/api/handlers';
import { taskHandlers } from '@/features/tasks/api/handlers';
import { eventHandlers } from '@/features/calendar/api/handlers';
import { notificationHandlers } from '@/features/notifications/api/handlers';
import { planHandlers, subscriptionHandlers } from '@/features/subscription/api/handlers';

export const handlers = [
  ...userHandlers,
  ...lobbyHandlers,
  ...taskHandlers,
  ...eventHandlers,
  ...authHandlers,
  ...notificationHandlers,
  ...planHandlers,
  ...subscriptionHandlers,
];
