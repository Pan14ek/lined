import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_LOBBIES, MOCK_LOBBY_INVITES, MOCK_FREE_SLOT } from './mockData';
import type {
  LobbyDto,
  LobbyCreateDto,
  LobbyUpdateDto,
  FreeSlotDto,
  LobbyInviteDto,
} from '@/features/lobby/model';

const lobbies: LobbyDto[] = MOCK_LOBBIES.map((l) => ({ ...l }));
const invites: LobbyInviteDto[] = MOCK_LOBBY_INVITES.map((i) => ({ ...i }));
let nextLobbyId = Math.max(...lobbies.map((l) => l.id)) + 1;
let nextInviteId = Math.max(...invites.map((i) => i.id)) + 1;

export const getMyLobbies = async (): Promise<LobbyDto[]> => {
  await mockDelay();
  return lobbies;
}

export const getLobby = async (id: number): Promise<LobbyDto> => {
  await mockDelay();
  const lobby = lobbies.find((l) => l.id === id);
  if (!lobby) throw new MockHttpError(404, 'Lobby not found');
  return lobby;
}

export const createLobby = async (data: LobbyCreateDto): Promise<LobbyDto> => {
  await mockDelay();
  if (!data.name.trim()) throw new MockHttpError(400, 'name must not be blank');
  const lobby: LobbyDto = { id: nextLobbyId++, name: data.name, lobbyType: data.lobbyType, ownerId: 1, memberIds: [1] };
  lobbies.push(lobby);
  return lobby;
}

export const updateLobby = async (id: number, data: LobbyUpdateDto): Promise<LobbyDto> => {
  await mockDelay();
  const lobby = lobbies.find((l) => l.id === id);
  if (!lobby) throw new MockHttpError(404, 'Lobby not found');
  if (data.ownerId != null && !lobby.memberIds.includes(data.ownerId)) {
    throw new MockHttpError(409, 'ownerId must be an existing lobby member');
  }
  Object.assign(lobby, data);
  return lobby;
}

export const getFreeSlots = async (lobbyId: number, from: string, to: string): Promise<FreeSlotDto[]> => {
  await mockDelay();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) throw new MockHttpError(404, 'Lobby not found');
  return MOCK_FREE_SLOT.start >= from && MOCK_FREE_SLOT.end <= to ? [MOCK_FREE_SLOT] : [];
}

export const removeMember = async (lobbyId: number, userId: number): Promise<LobbyDto> => {
  await mockDelay();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) throw new MockHttpError(404, 'Lobby not found');
  if (lobby.ownerId === userId) throw new MockHttpError(400, 'Owner cannot be removed from lobby');
  lobby.memberIds = lobby.memberIds.filter((id) => id !== userId);
  return lobby;
}

export const deleteLobby = async (id: number): Promise<void> => {
  await mockDelay();
  const index = lobbies.findIndex((l) => l.id === id);
  if (index === -1) throw new MockHttpError(404, 'Lobby not found');
  lobbies.splice(index, 1);
}

export type InviteTarget = { userId: number } | { userEmail: string };

export const createInvite = async (lobbyId: number, target: InviteTarget): Promise<LobbyInviteDto> => {
  await mockDelay();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) throw new MockHttpError(404, 'Lobby not found');

  const hasUserId = 'userId' in target;
  const hasUserEmail = 'userEmail' in target;
  const inviteeId = hasUserId ? target.userId : 2;

  if (lobby.memberIds.includes(inviteeId)) {
    throw new MockHttpError(409, 'User is already a lobby member');
  }
  const duplicate = invites.some(
    (i) => i.lobbyId === lobbyId && i.inviteeId === inviteeId && i.status === 'PENDING',
  );
  if (duplicate) throw new MockHttpError(409, 'A pending invite already exists for this user');
  if (!hasUserId && !hasUserEmail) {
    throw new MockHttpError(400, 'Supply exactly one of userId or userEmail');
  }

  const now = new Date().toISOString();
  const invite: LobbyInviteDto = {
    id: nextInviteId++,
    lobbyId,
    inviterId: lobby.ownerId,
    inviteeId,
    status: 'PENDING',
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };
  invites.push(invite);
  return invite;
}

export const listLobbyInvites = async (lobbyId: number): Promise<LobbyInviteDto[]> => {
  await mockDelay();
  return invites.filter((i) => i.lobbyId === lobbyId && i.status === 'PENDING');
}

export const resendInvite = async (_lobbyId: number, inviteId: number): Promise<LobbyInviteDto> => {
  await mockDelay();
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite) throw new MockHttpError(404, 'Invite not found');
  invite.sentAt = new Date().toISOString();
  return invite;
}

export const cancelInvite = async (_lobbyId: number, inviteId: number): Promise<void> => {
  await mockDelay();
  const index = invites.findIndex((i) => i.id === inviteId);
  if (index === -1) throw new MockHttpError(404, 'Invite not found');
  invites.splice(index, 1);
}

export const myInvites = async (): Promise<LobbyInviteDto[]> => {
  await mockDelay();
  return invites.filter((i) => i.status === 'PENDING');
}

const resolveInvite = (inviteId: number, status: 'ACCEPTED' | 'DECLINED'): LobbyInviteDto => {
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite) throw new MockHttpError(404, 'Invite not found');
  if (invite.status !== 'PENDING') throw new MockHttpError(409, 'Invite is no longer pending');
  invite.status = status;
  return invite;
}

export const acceptInvite = async (inviteId: number): Promise<LobbyInviteDto> => {
  await mockDelay();
  return resolveInvite(inviteId, 'ACCEPTED');
}

export const declineInvite = async (inviteId: number): Promise<LobbyInviteDto> => {
  await mockDelay();
  return resolveInvite(inviteId, 'DECLINED');
}
