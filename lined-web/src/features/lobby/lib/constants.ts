import type { LobbyType } from '@/features/lobby/model';

export const LOBBY_TYPES: LobbyType[] = ['COUPLE', 'FAMILY', 'FRIENDS', 'WORK'];

export const LOBBY_TYPE_LABELS: Record<LobbyType, string> = {
  COUPLE: 'Couple',
  FAMILY: 'Family',
  FRIENDS: 'Friends',
  WORK: 'Work',
};

export const LOBBY_TYPE_COLORS: Record<LobbyType, string> = {
  COUPLE: 'bg-lobby-couple',
  FAMILY: 'bg-lobby-family',
  FRIENDS: 'bg-lobby-friends',
  WORK: 'bg-lobby-work',
};

export const lobbyAccentColor = (lobbyType: LobbyType): string => {
  return `var(--color-lobby-${lobbyType.toLowerCase()})`;
}

export const LOBBY_TYPE_BADGE_CLASSES: Record<LobbyType, string> = {
  COUPLE: 'bg-lobby-couple/10 text-lobby-couple',
  FAMILY: 'bg-lobby-family/10 text-lobby-family',
  FRIENDS: 'bg-lobby-friends/10 text-lobby-friends',
  WORK: 'bg-lobby-work/10 text-lobby-work',
};

export const LOBBY_TYPE_BORDER_CLASSES: Record<LobbyType, string> = {
  COUPLE: 'border-lobby-couple',
  FAMILY: 'border-lobby-family',
  FRIENDS: 'border-lobby-friends',
  WORK: 'border-lobby-work',
};

export const LOBBY_TYPE_ICONS: Record<LobbyType, string> = {
  COUPLE: '💑',
  FAMILY: '👨‍👩‍👧‍👦',
  FRIENDS: '🎉',
  WORK: '💼',
};

export const LOBBY_TYPE_TAGLINES: Record<LobbyType, string> = {
  COUPLE: 'Just the two of you',
  FAMILY: 'Household & kids',
  FRIENDS: 'Your crew',
  WORK: 'Team planning',
};

export const QUERY_KEYS = {
  lobbies: ['lobbies'] as const,
  lobbyDetail: (id: number) => ['lobbies', id] as const,
  lobbyFreeSlots: (id: number) => ['lobbies', id, 'free-slots'] as const,
  lobbyInvites: (lobbyId: number) => ['lobby-invites', lobbyId] as const,
  myInvites: ['lobby-invites', 'mine'] as const,
} as const;
