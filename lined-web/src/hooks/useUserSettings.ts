import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUser, updateUser } from '@/api/users';
import { QUERY_KEYS } from '@/lib/constants';
import type { UserDto, UserUpdateDto } from '@/types';

export const useUpdateUser = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserUpdateDto) => updateUser(id, data),
    onSuccess: (user) => {
      queryClient.setQueryData<UserDto>(QUERY_KEYS.user(id), user);
    },
  });
};

export const useDeleteAccount = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteUser(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.user(id) });
    },
  });
};
