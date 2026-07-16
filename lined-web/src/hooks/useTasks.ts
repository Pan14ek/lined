import { useQuery } from '@tanstack/react-query';
import { listMyTasks } from '@/api/tasks';
import { QUERY_KEYS } from '@/lib/constants';

export function useMyTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.myTasks,
    queryFn: listMyTasks,
  });
}
