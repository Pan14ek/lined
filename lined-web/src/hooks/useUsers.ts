import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/api/users';
import { QUERY_KEYS } from '@/lib/constants';

export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.user(id ?? 0),
    queryFn: () => getUser(id!),
    enabled: id != null,
  });
}
