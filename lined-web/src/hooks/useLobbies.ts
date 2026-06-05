import { useQuery } from '@tanstack/react-query';
import { getMyLobbies, getLobby } from '@/api/lobbies';
import { QUERY_KEYS } from '@/lib/constants';

export function useMyLobbies() {
  return useQuery({
    queryKey: QUERY_KEYS.lobbies,
    queryFn: getMyLobbies,
  });
}

export function useLobby(id: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.lobbyDetail(id ?? 0),
    queryFn: () => getLobby(id!),
    enabled: id != null,
  });
}
