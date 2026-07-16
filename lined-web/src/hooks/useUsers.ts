import { useQuery, useQueries } from '@tanstack/react-query';
import { getUser } from '@/api/users';
import { QUERY_KEYS } from '@/lib/constants';

export function useUser(id: number | undefined) {
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
