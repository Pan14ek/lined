import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyLobbies,
  getLobby,
  createLobby,
  updateLobby,
  removeMember,
  deleteLobby,
} from '@/features/lobby/api';
import { QUERY_KEYS } from '@/features/lobby/lib/constants';
import type { LobbyDto, LobbyUpdateDto } from '@/features/lobby/model';

export const useMyLobbies = () => {
  return useQuery({
    queryKey: QUERY_KEYS.lobbies,
    queryFn: getMyLobbies,
  });
}

export const useLobby = (id: number | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.lobbyDetail(id ?? 0),
    queryFn: () => getLobby(id!),
    enabled: id != null,
  });
}

export const useCreateLobby = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLobby,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
}

export const useUpdateLobby = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LobbyUpdateDto) => updateLobby(lobbyId, data),
    onSuccess: (lobby) => {
      queryClient.setQueryData<LobbyDto>(QUERY_KEYS.lobbyDetail(lobbyId), lobby);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
};

export const useDeleteLobby = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lobbyId: number) => deleteLobby(lobbyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
};

export const useUpdateLobbyOwner = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ownerId: number) => updateLobby(lobbyId, { ownerId }),
    onSuccess: (lobby) => {
      queryClient.setQueryData<LobbyDto>(QUERY_KEYS.lobbyDetail(lobbyId), lobby);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
};

export const useRemoveMember = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => removeMember(lobbyId, userId),
    onSuccess: (lobby) => {
      queryClient.setQueryData<LobbyDto>(QUERY_KEYS.lobbyDetail(lobbyId), lobby);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
  });
};
