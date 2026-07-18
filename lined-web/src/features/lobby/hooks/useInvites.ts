import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const useResendInvite = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => resendInvite(lobbyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
  });
};

export const useCancelInvite = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => cancelInvite(lobbyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
  });
};

export const useMyInvites = () =>
  useQuery({
    queryKey: QUERY_KEYS.myInvites,
    queryFn: myInvites,
    refetchOnWindowFocus: true,
  });

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
  });
};
