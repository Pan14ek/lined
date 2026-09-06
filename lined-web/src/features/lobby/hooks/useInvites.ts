import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorStatus } from '@/lib/apiClient';
import {
  createInvite,
  listLobbyInvites,
  resendInvite,
  cancelInvite,
  myInvites,
  acceptInvite,
  declineInvite,
  type InviteTarget,
} from '@/features/lobby/api';
import { QUERY_KEYS } from '@/features/lobby/lib/constants';
import type { LobbyInviteDto } from '@/features/lobby/model';

export const useLobbyInvites = (lobbyId: number | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.lobbyInvites(lobbyId ?? 0),
    queryFn: () => listLobbyInvites(lobbyId!),
    enabled: lobbyId != null,
  });

export const useCreateInvite = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target: InviteTarget) => createInvite(lobbyId, target),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
  });
};

/** A 404 means the invite is stale (wrong lobby/already resolved) — refetch the list to drop it. */
const refetchInvitesOn404 = (
  queryClient: ReturnType<typeof useQueryClient>,
  lobbyId: number,
  error: unknown,
) => {
  if (getErrorStatus(error) !== 404) return;
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
}

export const useResendInvite = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => resendInvite(lobbyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
    onError: (error) => refetchInvitesOn404(queryClient, lobbyId, error),
  });
};

export const useCancelInvite = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => cancelInvite(lobbyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
    onError: (error) => refetchInvitesOn404(queryClient, lobbyId, error),
  });
};

export const useMyInvites = () =>
  useQuery({
    queryKey: QUERY_KEYS.myInvites,
    queryFn: myInvites,
    refetchOnWindowFocus: true,
  });

/** Removes a stale invite (cancelled/expired/no longer this caller's) after a `404`. */
const removeStaleInviteOn404 = (
  queryClient: ReturnType<typeof useQueryClient>,
  error: unknown,
  inviteId: number,
) => {
  if (getErrorStatus(error) !== 404) return;
  queryClient.setQueryData<LobbyInviteDto[]>(QUERY_KEYS.myInvites, (current) =>
    current?.filter((invite) => invite.id !== inviteId),
  );
}

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => acceptInvite(inviteId),
    onSuccess: (_data, inviteId) => {
      queryClient.setQueryData<LobbyInviteDto[]>(QUERY_KEYS.myInvites, (current) =>
        current?.filter((invite) => invite.id !== inviteId),
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbies });
    },
    onError: (error, inviteId) => removeStaleInviteOn404(queryClient, error, inviteId),
  });
};

export const useDeclineInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => declineInvite(inviteId),
    onSuccess: (_data, inviteId) => {
      queryClient.setQueryData<LobbyInviteDto[]>(QUERY_KEYS.myInvites, (current) =>
        current?.filter((invite) => invite.id !== inviteId),
      );
    },
    onError: (error, inviteId) => removeStaleInviteOn404(queryClient, error, inviteId),
  });
};
