import { api } from './client';
import type { LobbyInviteDto } from '@/types';

export type InviteTarget = { userId: number } | { userEmail: string };

export function createInvite(
  lobbyId: number,
  target: InviteTarget,
): Promise<LobbyInviteDto> {
  return api
    .post(`lobbies/${lobbyId}/invites`, {
      searchParams: target as Record<string, string | number>,
    })
    .json<LobbyInviteDto>();
}

export function listLobbyInvites(lobbyId: number): Promise<LobbyInviteDto[]> {
  return api.get(`lobbies/${lobbyId}/invites`).json<LobbyInviteDto[]>();
}

export function resendInvite(
  lobbyId: number,
  inviteId: number,
): Promise<LobbyInviteDto> {
  return api
    .post(`lobbies/${lobbyId}/invites/${inviteId}/resend`)
    .json<LobbyInviteDto>();
}

export function cancelInvite(lobbyId: number, inviteId: number): Promise<void> {
  return api.delete(`lobbies/${lobbyId}/invites/${inviteId}`).then(() => undefined);
}

export function myInvites(): Promise<LobbyInviteDto[]> {
  return api.get('lobby-invites/mine').json<LobbyInviteDto[]>();
}

export function acceptInvite(inviteId: number): Promise<LobbyInviteDto> {
  return api.post(`lobby-invites/${inviteId}/accept`).json<LobbyInviteDto>();
}

export function declineInvite(inviteId: number): Promise<LobbyInviteDto> {
  return api.post(`lobby-invites/${inviteId}/decline`).json<LobbyInviteDto>();
}
