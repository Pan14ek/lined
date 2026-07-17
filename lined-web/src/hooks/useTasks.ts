import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, listMyTasks, listTasks, updateTask } from '@/api/tasks';
import { QUERY_KEYS } from '@/lib/constants';
import type { TaskDto, TaskStatus, TaskUpdateDto } from '@/types';

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

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}

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

interface UpdateTaskStatusContext {
  previous: TaskDto[] | undefined;
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, unknown, { id: number; status: TaskStatus }, UpdateTaskStatusContext>({
    mutationFn: ({ id, status }) => updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.myTasks });
      const previous = queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.myTasks);
      queryClient.setQueryData<TaskDto[]>(QUERY_KEYS.myTasks, (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEYS.myTasks, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myTasks });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<TaskDto[]>(QUERY_KEYS.myTasks, (old) =>
        old?.filter((t) => t.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}
