import { useAuthStore } from '@/store/auth';
import { useUser } from './useUsers';

export const useCurrentUser = () => {
  const userId = useAuthStore((s) => s.userId);
  return useUser(userId ?? undefined);
}
