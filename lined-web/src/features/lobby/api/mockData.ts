import type { LobbyDto, FreeSlotDto, LobbyInviteDto } from '@/features/lobby/model';

export const MOCK_LOBBIES: LobbyDto[] = [
  {
    id: 1,
    name: 'Alex & Anastasiia',
    lobbyType: 'COUPLE',
    ownerId: 1,
    memberIds: [1, 2],
  },
  {
    id: 2,
    name: 'Johnson Family',
    lobbyType: 'FAMILY',
    ownerId: 1,
    memberIds: [1, 2],
  },
  {
    id: 3,
    name: 'Weekend Crew',
    lobbyType: 'FRIENDS',
    ownerId: 1,
    memberIds: [1, 2],
  },
  {
    id: 4,
    name: 'Design Team',
    lobbyType: 'WORK',
    ownerId: 1,
    memberIds: [1, 5, 6, 7],
  },
];

const today = new Date();
const inThreeDaysStr = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

/** A 3h mutual free window a few days out, used by the dashboard free-slot banner. */
export const MOCK_FREE_SLOT: FreeSlotDto = {
  start: `${inThreeDaysStr}T14:00:00Z`,
  end: `${inThreeDaysStr}T17:00:00Z`,
};

export const MOCK_LOBBY_INVITES: LobbyInviteDto[] = [
  {
    id: 1,
    lobbyId: 3,
    inviterId: 1,
    inviteeId: 2,
    status: 'PENDING',
    sentAt: '2026-07-15T10:00:00Z',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 2,
    lobbyId: 1,
    inviterId: 1,
    inviteeId: 3,
    status: 'PENDING',
    sentAt: '2026-03-27T10:00:00Z',
    createdAt: '2026-03-27T10:00:00Z',
    updatedAt: '2026-03-27T10:00:00Z',
  },
  {
    id: 3,
    lobbyId: 4,
    inviterId: 1,
    inviteeId: 8,
    status: 'PENDING',
    sentAt: '2026-07-16T09:00:00Z',
    createdAt: '2026-07-16T09:00:00Z',
    updatedAt: '2026-07-16T09:00:00Z',
  },
];
