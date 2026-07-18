import { USE_MOCKS } from '@/lib/apiClient';
import * as devApi from './dev';
import * as prodApi from './prod';

const impl = USE_MOCKS ? devApi : prodApi;

export const {
  getMyLobbies,
  getLobby,
  createLobby,
  updateLobby,
  getFreeSlots,
  removeMember,
  deleteLobby,
  createInvite,
  listLobbyInvites,
  resendInvite,
  cancelInvite,
  myInvites,
  acceptInvite,
  declineInvite,
} = impl;

export type { InviteTarget } from './prod';
