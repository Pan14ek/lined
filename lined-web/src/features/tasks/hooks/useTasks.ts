import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { getErrorStatus } from '@/lib/apiClient';
import { createTask, deleteTask, listMyTasks, listTasks, updateTask } from '@/features/tasks/api';
import { QUERY_KEYS } from '@/features/tasks/lib/constants';
import type { TaskDto, TaskStatus, TaskUpdateDto } from '@/features/tasks/model';

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

interface TaskCacheSnapshot {
  previous: Array<[QueryKey, TaskDto[] | undefined]>;
}

const snapshotTaskCaches = async (queryClient: QueryClient): Promise<TaskCacheSnapshot> => {
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tasks });
  return { previous: queryClient.getQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }) };
}

const patchTaskCaches = (queryClient: QueryClient, id: number, patch: Partial<TaskDto>) => {
  queryClient.setQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
    old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
}

const rollbackTaskCaches = (queryClient: QueryClient, snapshot: TaskCacheSnapshot | undefined) => {
  snapshot?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

const removeTaskFromCaches = (queryClient: QueryClient, id: number) => {
  queryClient.setQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
    old?.filter((t) => t.id !== id),
  );
}

/**
 * A `404` means the task is gone/inaccessible — restoring the pre-mutation
 * snapshot would resurrect a phantom row, so remove it from every cached
 * list instead. Any other error (e.g. `403`) rolls back to the last known
 * legitimate state as before.
 */
const handleTaskMutationError = (
  queryClient: QueryClient,
  id: number,
  error: unknown,
  snapshot: TaskCacheSnapshot | undefined,
) => {
  if (getErrorStatus(error) === 404) {
    removeTaskFromCaches(queryClient, id);
    return;
  }
  rollbackTaskCaches(queryClient, snapshot);
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, unknown, { id: number; data: TaskUpdateDto }, TaskCacheSnapshot>({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onMutate: async ({ id, data }) => {
      const snapshot = await snapshotTaskCaches(queryClient);
      patchTaskCaches(queryClient, id, data);
      return snapshot;
    },
    onSuccess: (updatedTask) => patchTaskCaches(queryClient, updatedTask.id, updatedTask),
    onError: (error, { id }, context) => handleTaskMutationError(queryClient, id, error, context),
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, unknown, { id: number; status: TaskStatus }, TaskCacheSnapshot>({
    mutationFn: ({ id, status }) => updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      const snapshot = await snapshotTaskCaches(queryClient);
      patchTaskCaches(queryClient, id, { status });
      return snapshot;
    },
    onSuccess: (updatedTask) => patchTaskCaches(queryClient, updatedTask.id, updatedTask),
    onError: (error, { id }, context) => handleTaskMutationError(queryClient, id, error, context),
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
