export type LobbyType = 'COUPLE' | 'FAMILY' | 'FRIENDS' | 'WORK';

export interface LobbyDto {
  id: number;
  name: string;
  lobbyType: LobbyType;
  ownerId: number;
  memberIds: number[];
}

export interface LobbyCreateDto {
  name: string;
  lobbyType: LobbyType;
}

export interface LobbyUpdateDto {
  name?: string;
  lobbyType?: LobbyType;
  ownerId?: number;
}

export interface FreeSlotDto {
  start: string;
  end: string;
}

export type LobbyInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface LobbyInviteDto {
  id: number;
  lobbyId: number;
  inviterId: number;
  inviteeId: number;
  status: LobbyInviteStatus;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}
