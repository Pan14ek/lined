import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/api/users';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';

export function useCurrentUser() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: QUERY_KEYS.user(userId ?? 0),
    queryFn: () => getUser(userId!),
    enabled: userId != null,
  });
}
