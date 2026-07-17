import { userHandlers } from './users';
import { lobbyHandlers } from './lobbies';
import { taskHandlers } from './tasks';
import { eventHandlers } from './events';
import { authHandlers } from './auth';
import { inviteHandlers } from './invites';
import { notificationHandlers } from './notifications';
import { planHandlers } from './plans';
import { subscriptionHandlers } from './subscriptions';

export const handlers = [
  ...userHandlers,
  ...lobbyHandlers,
  ...taskHandlers,
  ...eventHandlers,
  ...authHandlers,
  ...inviteHandlers,
  ...notificationHandlers,
  ...planHandlers,
  ...subscriptionHandlers,
];
