import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInvite,
  listLobbyInvites,
  resendInvite,
  cancelInvite,
  type InviteTarget,
} from '@/api/invites';
import { QUERY_KEYS } from '@/lib/constants';

export const useLobbyInvites = (lobbyId: number | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.lobbyInvites(lobbyId ?? 0),
    queryFn: () => listLobbyInvites(lobbyId!),
    enabled: lobbyId != null,
  });

export function useCreateInvite(lobbyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target: InviteTarget) => createInvite(lobbyId, target),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
  });
}

export function useResendInvite(lobbyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => resendInvite(lobbyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
  });
}

export function useCancelInvite(lobbyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => cancelInvite(lobbyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lobbyInvites(lobbyId) });
    },
  });
}
