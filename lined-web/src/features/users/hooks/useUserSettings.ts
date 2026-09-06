import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUser, updateUser } from '@/features/users/api';
import { QUERY_KEYS } from '@/features/users/lib/constants';
import type { UserDto, UserPublicDto, UserUpdateDto } from '@/features/users/model';

/** Reads the caller's own id from the already-loaded `/users/me` cache entry. */
const requireCurrentUserId = (
  queryClient: ReturnType<typeof useQueryClient>,
): number => {
  const currentUser = queryClient.getQueryData<UserDto>(QUERY_KEYS.currentUser);
  if (!currentUser) throw new Error('Current user is not loaded');
  return currentUser.id;
};

/** Self-scoped profile update — never accepts an arbitrary target user id. */
export const useUpdateCurrentUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserUpdateDto) => updateUser(requireCurrentUserId(queryClient), data),
    onSuccess: (user) => {
      queryClient.setQueryData<UserDto>(QUERY_KEYS.currentUser, user);
      // Keep the public-directory projection of this same account (member
      // lists, avatars, assignee pickers) in sync — public fields only.
      queryClient.setQueryData<UserPublicDto>(QUERY_KEYS.user(user.id), {
        id: user.id,
        username: user.username,
      });
    },
  });
};

/** Self-scoped account deletion — never accepts an arbitrary target user id. */
export const useDeleteCurrentAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteUser(requireCurrentUserId(queryClient)),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.currentUser });
    },
  });
};
