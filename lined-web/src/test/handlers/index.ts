import { userHandlers } from './users';
import { lobbyHandlers } from './lobbies';
import { taskHandlers } from './tasks';
import { eventHandlers } from './events';

export const handlers = [
  ...userHandlers,
  ...lobbyHandlers,
  ...taskHandlers,
  ...eventHandlers,
];
