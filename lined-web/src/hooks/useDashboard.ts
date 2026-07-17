import { useQuery, useQueries } from '@tanstack/react-query';
import type { FreeSlotDto, LobbyDto } from '@/types';
import { getFreeSlots } from '@/api/lobbies';
import { QUERY_KEYS } from '@/lib/constants';
import { addDays } from '@/lib/calendarUtils';
import { useAuthStore } from '@/store/auth';
import { useMyLobbies } from './useLobbies';
import { useUser } from './useUsers';

const FREE_SLOTS_WINDOW_DAYS = 7;
const MIN_FREE_SLOT_MS = 60 * 60 * 1000; // 1 hour

export interface FreeSlotBannerData {
  lobbyId: number;
  start: string;
  end: string;
  lobbyName: string;
  otherUsername: string | null;
}

/** First slot at least `minMs` long, or null if none qualify. */
function findEarliestFreeSlot(
  slots: FreeSlotDto[] | undefined,
  minMs: number,
): FreeSlotDto | null {
  return (
    slots?.find((s) => new Date(s.end).getTime() - new Date(s.start).getTime() >= minMs) ?? null
  );
}

/**
 * Surfaces the earliest ≥1h mutual free slot (next 7 days) for the current
 * user's first multi-member lobby, using the server-side free-slots API.
 */
export function useFreeSlotBanner(): {
  isLoading: boolean;
  slot: FreeSlotBannerData | null;
} {
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

/**
 * Earliest ≥1h mutual free slot per multi-member lobby (next 7 days), sorted
 * soonest-first. Used by ReserveSlotModal when opened with no specific slot
 * (the "+ Create → Reserve Free Slot" entry point) to offer a picker.
 */
export function useFreeSlotCandidates(lobbies: LobbyDto[]): {
  candidates: FreeSlotCandidate[];
  isLoading: boolean;
} {
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

/** Free slots for one lobby over the visible week, used by the lobby calendar tab. */
export function useLobbyFreeSlots(lobbyId: number, weekStart: Date) {
  const from = weekStart.toISOString();
  const to = addDays(weekStart, FREE_SLOTS_WINDOW_DAYS).toISOString();

  return useQuery<FreeSlotDto[]>({
    queryKey: [...QUERY_KEYS.lobbyFreeSlots(lobbyId), from.slice(0, 10)],
    queryFn: () => getFreeSlots(lobbyId, from, to),
  });
}
