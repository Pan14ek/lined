import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyLobbies, getLobby, createLobby } from '@/api/lobbies';
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

export function useCreateLobby() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLobby,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
}
