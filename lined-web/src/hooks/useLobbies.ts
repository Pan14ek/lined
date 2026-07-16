import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyLobbies, getLobby, createLobby, updateLobby, removeMember } from '@/api/lobbies';
import { QUERY_KEYS } from '@/lib/constants';
import type { LobbyDto } from '@/types';

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

export function useUpdateLobbyOwner(lobbyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ownerId: number) => updateLobby(lobbyId, { ownerId }),
    onSuccess: (lobby) => {
      queryClient.setQueryData<LobbyDto>(QUERY_KEYS.lobbyDetail(lobbyId), lobby);
    },
  });
}

export function useRemoveMember(lobbyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => removeMember(lobbyId, userId),
    onSuccess: (lobby) => {
      queryClient.setQueryData<LobbyDto>(QUERY_KEYS.lobbyDetail(lobbyId), lobby);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
}
