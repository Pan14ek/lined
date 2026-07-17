import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { createTask, deleteTask, listMyTasks, listTasks, updateTask } from '@/api/tasks';
import { QUERY_KEYS } from '@/lib/constants';
import type { TaskDto, TaskStatus, TaskUpdateDto } from '@/types';

export const useMyTasks = () =>
  useQuery({
    queryKey: QUERY_KEYS.myTasks,
    queryFn: listMyTasks,
  });

export const useLobbyTasks = (lobbyId: number | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.lobbyTasks(lobbyId ?? 0),
    queryFn: () => listTasks({ lobbyId }),
    enabled: lobbyId != null,
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
};

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
  previous: Array<[QueryKey, TaskDto[] | undefined]>;
}

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, unknown, { id: number; status: TaskStatus }, UpdateTaskStatusContext>({
    mutationFn: ({ id, status }) => updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tasks });
      const previous = queryClient.getQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks });
      queryClient.setQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { previous };
    },
    onSuccess: (updatedTask) => {
      // Patches myTasks and every cached lobbyTasks(lobbyId) list at once, since
      // this hook doesn't know which lobby the task belongs to.
      queryClient.setQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
        old?.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      );
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: (_data, id) => {
      queryClient.setQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
        old?.filter((t) => t.id !== id),
      );
    },
  });
};
