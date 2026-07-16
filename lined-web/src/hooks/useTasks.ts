import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMyTasks, listTasks, updateTask } from '@/api/tasks';
import { QUERY_KEYS } from '@/lib/constants';
import type { TaskDto, TaskUpdateDto } from '@/types';

export function useMyTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.myTasks,
    queryFn: listMyTasks,
  });
}

export const useLobbyTasks = (lobbyId: number | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.lobbyTasks(lobbyId ?? 0),
    queryFn: () => listTasks({ lobbyId }),
    enabled: lobbyId != null,
  });

export const useUpdateTask = (lobbyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskUpdateDto }) => updateTask(id, data),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<TaskDto[]>(QUERY_KEYS.lobbyTasks(lobbyId), (old) =>
        old?.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myTasks });
    },
  });
};
