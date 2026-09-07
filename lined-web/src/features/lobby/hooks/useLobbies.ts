import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorStatus } from '@/lib/apiClient';
import {
  getMyLobbies,
  getLobby,
  createLobby,
  updateLobby,
  removeMember,
  deleteLobby,
} from '@/features/lobby/api';
import { QUERY_KEYS } from '@/features/lobby/lib/constants';
import { removeLobbyScopedQueries } from '@/features/lobby/lib/cache';
import type { LobbyDto, LobbyUpdateDto } from '@/features/lobby/model';

export const useMyLobbies = () => {
  return useQuery({
    queryKey: QUERY_KEYS.lobbies,
    queryFn: getMyLobbies,
  });
}

export const useLobby = (id: number | undefined) => {
  const queryClient = useQueryClient();
  // Once a lobby id 404s (hidden/deleted/access revoked), stop fetching it —
  // disabling it here (this render) before the effect below removes its
  // cache entry (next commit) means the removal never has an enabled
  // observer left to react to it by refetching.
  const [purgedId, setPurgedId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEYS.lobbyDetail(id ?? 0),
    queryFn: () => getLobby(id!),
    enabled: id != null && id !== purgedId,
  });

  // `useQuery` (v5) has no per-query onError, so detecting the terminal 404
  // is a render-time state adjustment (same pattern as ProfileCard's form
  // seeding) — guarded by `id !== purgedId` so it fires exactly once per
  // newly-discovered-inaccessible id.
  if (id != null && id !== purgedId && query.error && getErrorStatus(query.error) === 404) {
    setPurgedId(id);
  }

  useEffect(() => {
    if (purgedId != null) removeLobbyScopedQueries(queryClient, purgedId);
  }, [purgedId, queryClient]);

  return query;
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
    onSuccess: (_data, lobbyId) => {
      removeLobbyScopedQueries(queryClient, lobbyId);
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
