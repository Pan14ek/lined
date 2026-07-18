import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

interface OptimisticPatchOptions<TData, TPatch> {
  queryKey: QueryKey;
  mutationFn: (patch: TPatch) => Promise<TData>;
}

interface OptimisticPatchContext<TData> {
  previous: TData | undefined;
}

export const useOptimisticPatchMutation = <TData, TPatch extends object>({
  queryKey,
  mutationFn,
}: OptimisticPatchOptions<TData, TPatch>) => {
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TPatch, OptimisticPatchContext<TData>>({
    mutationFn,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TData>(queryKey);
      if (previous) {
        queryClient.setQueryData<TData>(queryKey, { ...previous, ...patch });
      }
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TData>(queryKey, updated);
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData<TData>(queryKey, context.previous);
      }
    },
  });
}
