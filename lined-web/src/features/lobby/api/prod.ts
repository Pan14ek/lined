import { api, requestVoid, toSearchParams } from '@/lib/apiClient';
import type {
  LobbyDto,
  LobbyCreateDto,
  LobbyUpdateDto,
  FreeSlotDto,
  LobbyInviteDto,
} from '@/features/lobby/model';

export const getMyLobbies = (): Promise<LobbyDto[]> => {
  return api.get('lobbies/mine').json<LobbyDto[]>();
}

export const getLobby = (id: number): Promise<LobbyDto> => {
  return api.get(`lobbies/${id}`).json<LobbyDto>();
}

export const createLobby = (data: LobbyCreateDto): Promise<LobbyDto> => {
  return api.post('lobbies', { json: data }).json<LobbyDto>();
}

export const updateLobby = (id: number, data: LobbyUpdateDto): Promise<LobbyDto> => {
  return api.patch(`lobbies/${id}`, { json: data }).json<LobbyDto>();
}

export const getFreeSlots = (lobbyId: number, from: string, to: string): Promise<FreeSlotDto[]> => {
  return api
    .get(`lobbies/${lobbyId}/free-slots`, { searchParams: { from, to } })
    .json<FreeSlotDto[]>();
}

export const removeMember = (lobbyId: number, userId: number): Promise<LobbyDto> => {
  return api.delete(`lobbies/${lobbyId}/members/${userId}`).json<LobbyDto>();
}

export const deleteLobby = (id: number): Promise<void> => {
  return requestVoid('delete', `lobbies/${id}`);
}

export type InviteTarget = { userId: number } | { userEmail: string };

export const createInvite = (
  lobbyId: number,
  target: InviteTarget,
): Promise<LobbyInviteDto> => {
  return api
    .post(`lobbies/${lobbyId}/invites`, { searchParams: toSearchParams(target) })
    .json<LobbyInviteDto>();
}

export const listLobbyInvites = (lobbyId: number): Promise<LobbyInviteDto[]> => {
  return api.get(`lobbies/${lobbyId}/invites`).json<LobbyInviteDto[]>();
}

export const resendInvite = (
  lobbyId: number,
  inviteId: number,
): Promise<LobbyInviteDto> => {
  return api
    .post(`lobbies/${lobbyId}/invites/${inviteId}/resend`)
    .json<LobbyInviteDto>();
}

export const cancelInvite = (lobbyId: number, inviteId: number): Promise<void> => {
  return requestVoid('delete', `lobbies/${lobbyId}/invites/${inviteId}`);
}

export const myInvites = (): Promise<LobbyInviteDto[]> => {
  return api.get('lobby-invites/mine').json<LobbyInviteDto[]>();
}

export const acceptInvite = (inviteId: number): Promise<LobbyInviteDto> => {
  return api.post(`lobby-invites/${inviteId}/accept`).json<LobbyInviteDto>();
}

export const declineInvite = (inviteId: number): Promise<LobbyInviteDto> => {
  return api.post(`lobby-invites/${inviteId}/decline`).json<LobbyInviteDto>();
}
