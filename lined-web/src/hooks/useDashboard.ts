import { useQuery } from '@tanstack/react-query';
import { getFreeSlots } from '@/api/lobbies';
import { QUERY_KEYS } from '@/lib/constants';
import { addDays } from '@/lib/calendarUtils';
import { useAuthStore } from '@/store/auth';
import { useMyLobbies } from './useLobbies';
import { useUser } from './useUsers';

const FREE_SLOT_WINDOW_DAYS = 7;
const MIN_SLOT_MS = 60 * 60 * 1000; // 1 hour

export interface FreeSlotBannerData {
  start: string;
  end: string;
  lobbyName: string;
  otherUsername: string | null;
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
  const to = addDays(from, FREE_SLOT_WINDOW_DAYS);

  const freeSlotsQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.lobbyFreeSlots(targetLobby?.id ?? 0),
      from.toISOString().slice(0, 10),
    ],
    queryFn: () =>
      getFreeSlots(targetLobby!.id, from.toISOString(), to.toISOString()),
    enabled: targetLobby != null,
  });

  const slot =
    freeSlotsQuery.data?.find(
      (s) => new Date(s.end).getTime() - new Date(s.start).getTime() >= MIN_SLOT_MS,
    ) ?? null;

  const otherMemberId = targetLobby?.memberIds.find((id) => id !== currentUserId);
  const otherUserQuery = useUser(slot ? otherMemberId : undefined);

  if (!slot || !targetLobby) {
    return { isLoading: freeSlotsQuery.isLoading, slot: null };
  }

  return {
    isLoading: freeSlotsQuery.isLoading,
    slot: {
      start: slot.start,
      end: slot.end,
      lobbyName: targetLobby.name,
      otherUsername: otherUserQuery.data?.username ?? null,
    },
  };
}
