import { userHandlers } from './users';
import { lobbyHandlers } from './lobbies';
import { taskHandlers } from './tasks';
import { eventHandlers } from './events';
import { authHandlers } from './auth';
import { inviteHandlers } from './invites';
import { notificationHandlers } from './notifications';

export const handlers = [
  ...userHandlers,
  ...lobbyHandlers,
  ...taskHandlers,
  ...eventHandlers,
  ...authHandlers,
  ...inviteHandlers,
  ...notificationHandlers,
];
