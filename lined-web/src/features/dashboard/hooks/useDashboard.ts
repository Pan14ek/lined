import { useQuery, useQueries } from '@tanstack/react-query';
import type { FreeSlotDto, LobbyDto } from '@/features/lobby/model';
import { getFreeSlots } from '@/features/lobby/api';
import { QUERY_KEYS } from '@/features/lobby/lib/constants';
import { addDays } from '@/features/calendar/lib/calendarUtils';
import { useAuthStore } from '@/store/auth';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useUser } from '@/features/users/hooks/useUsers';

const FREE_SLOTS_WINDOW_DAYS = 7;
const MIN_FREE_SLOT_MS = 60 * 60 * 1000; // 1 hour

export interface FreeSlotBannerData {
  lobbyId: number;
  start: string;
  end: string;
  lobbyName: string;
  otherUsername: string | null;
}

export const findEarliestFreeSlot = (slots: FreeSlotDto[] | undefined, minMs: number): FreeSlotDto | null => {
  return (
    slots?.find((s) => new Date(s.end).getTime() - new Date(s.start).getTime() >= minMs) ?? null
  );
}

export const useFreeSlotBanner = (): {
  isLoading: boolean;
  slot: FreeSlotBannerData | null;
} => {
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: lobbies } = useMyLobbies();
  const targetLobby = lobbies?.find((l) => l.memberIds.length > 1) ?? null;

  const from = new Date();
  const to = addDays(from, FREE_SLOTS_WINDOW_DAYS);

  const freeSlotsQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.lobbyFreeSlots(targetLobby?.id ?? 0),
      from.toISOString().slice(0, 10),
    ],
    queryFn: () =>
      getFreeSlots(targetLobby!.id, from.toISOString(), to.toISOString()),
    enabled: targetLobby != null,
  });

  const slot = findEarliestFreeSlot(freeSlotsQuery.data, MIN_FREE_SLOT_MS);
  const otherMemberId = targetLobby?.memberIds.find((id) => id !== currentUserId);
  const otherUserQuery = useUser(slot ? otherMemberId : undefined);

  if (!slot || !targetLobby) {
    return { isLoading: freeSlotsQuery.isLoading, slot: null };
  }

  return {
    isLoading: freeSlotsQuery.isLoading,
    slot: {
      lobbyId: targetLobby.id,
      start: slot.start,
      end: slot.end,
      lobbyName: targetLobby.name,
      otherUsername: otherUserQuery.data?.username ?? null,
    },
  };
}

export interface FreeSlotCandidate {
  lobby: LobbyDto;
  start: string;
  end: string;
}

export const useFreeSlotCandidates = (lobbies: LobbyDto[]): {
  candidates: FreeSlotCandidate[];
  isLoading: boolean;
} => {
  const multiMemberLobbies = lobbies.filter((l) => l.memberIds.length > 1);
  const from = new Date();
  const to = addDays(from, FREE_SLOTS_WINDOW_DAYS);
  const fromKey = from.toISOString().slice(0, 10);

  const queries = useQueries({
    queries: multiMemberLobbies.map((lobby) => ({
      queryKey: [...QUERY_KEYS.lobbyFreeSlots(lobby.id), fromKey],
      queryFn: () => getFreeSlots(lobby.id, from.toISOString(), to.toISOString()),
    })),
  });

  const candidates: FreeSlotCandidate[] = multiMemberLobbies
    .map((lobby, i) => {
      const slot = findEarliestFreeSlot(queries[i]?.data, MIN_FREE_SLOT_MS);
      return slot ? { lobby, start: slot.start, end: slot.end } : null;
    })
    .filter((c): c is FreeSlotCandidate => c != null)
    .sort((a, b) => a.start.localeCompare(b.start));

  return { candidates, isLoading: queries.some((q) => q.isLoading) };
}

export const useNextFreeSlotHint = (lobbyId: number | null, afterIso: string | null, minDurationMs: number, enabled: boolean): { slot: FreeSlotDto | null; isLoading: boolean } => {
  const from = afterIso ? new Date(afterIso) : null;
  const to = from ? addDays(from, FREE_SLOTS_WINDOW_DAYS) : null;
  const queryEnabled = enabled && lobbyId != null && from != null;

  const query = useQuery({
    queryKey: [...QUERY_KEYS.lobbyFreeSlots(lobbyId ?? 0), 'hint', afterIso ?? ''],
    queryFn: () => getFreeSlots(lobbyId!, from!.toISOString(), to!.toISOString()),
    enabled: queryEnabled,
  });

  return {
    slot: queryEnabled ? findEarliestFreeSlot(query.data, minDurationMs) : null,
    isLoading: query.isLoading,
  };
}

export const useLobbyFreeSlots = (lobbyId: number, weekStart: Date) => {
  const from = weekStart.toISOString();
  const to = addDays(weekStart, FREE_SLOTS_WINDOW_DAYS).toISOString();

  return useQuery<FreeSlotDto[]>({
    queryKey: [...QUERY_KEYS.lobbyFreeSlots(lobbyId), from.slice(0, 10)],
    queryFn: () => getFreeSlots(lobbyId, from, to),
  });
}
