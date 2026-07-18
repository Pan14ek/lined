import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
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

interface TaskCacheSnapshot {
  previous: Array<[QueryKey, TaskDto[] | undefined]>;
}

/**
 * Optimistic-update plumbing shared by every task mutation below: `tasks/mine`
 * and every cached `tasks/lobby/{id}` list all share the `['tasks', ...]`
 * query-key prefix, so a single `{queryKey: QUERY_KEYS.tasks}` filter
 * snapshots/patches/rolls back all of them at once without knowing which
 * lobby a task belongs to.
 */
async function snapshotTaskCaches(queryClient: QueryClient): Promise<TaskCacheSnapshot> {
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tasks });
  return { previous: queryClient.getQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }) };
}

function patchTaskCaches(queryClient: QueryClient, id: number, patch: Partial<TaskDto>) {
  queryClient.setQueriesData<TaskDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) =>
    old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
}

function rollbackTaskCaches(queryClient: QueryClient, snapshot: TaskCacheSnapshot | undefined) {
  snapshot?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
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
    onError: (_err, _vars, context) => rollbackTaskCaches(queryClient, context),
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
    onError: (_err, _vars, context) => rollbackTaskCaches(queryClient, context),
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
