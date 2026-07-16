import { api } from './client';
import type { LobbyDto, LobbyCreateDto, LobbyUpdateDto, FreeSlotDto } from '@/types';

export function getMyLobbies(): Promise<LobbyDto[]> {
  return api.get('lobbies/mine').json<LobbyDto[]>();
}

export function getLobby(id: number): Promise<LobbyDto> {
  return api.get(`lobbies/${id}`).json<LobbyDto>();
}

export function createLobby(data: LobbyCreateDto): Promise<LobbyDto> {
  return api.post('lobbies', { json: data }).json<LobbyDto>();
}

export function updateLobby(id: number, data: LobbyUpdateDto): Promise<LobbyDto> {
  return api.patch(`lobbies/${id}`, { json: data }).json<LobbyDto>();
}

export function getFreeSlots(
  lobbyId: number,
  from: string,
  to: string,
): Promise<FreeSlotDto[]> {
  return api
    .get(`lobbies/${lobbyId}/free-slots`, { searchParams: { from, to } })
    .json<FreeSlotDto[]>();
}

export function removeMember(lobbyId: number, userId: number): Promise<LobbyDto> {
  return api.delete(`lobbies/${lobbyId}/members/${userId}`).json<LobbyDto>();
}

export function deleteLobby(id: number): Promise<void> {
  return api.delete(`lobbies/${id}`).then(() => undefined);
}
