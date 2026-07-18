import { useQuery, useQueries } from '@tanstack/react-query';
import { getUser, searchUsers } from '@/features/users/api';
import { QUERY_KEYS } from '@/features/users/lib/constants';

export const useUser = (id: number | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.user(id ?? 0),
    queryFn: () => getUser(id!),
    enabled: id != null,
  });
}

export const useUsers = (ids: number[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: QUERY_KEYS.user(id),
      queryFn: () => getUser(id),
    })),
  });

export const useUserSearch = (query: string) =>
  useQuery({
    queryKey: QUERY_KEYS.userSearch(query),
    queryFn: () => searchUsers(query),
    enabled: query.trim().length >= 2,
  });
