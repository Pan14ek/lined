import { useState } from 'react';

export const useRowMutationState = () => {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const clearError = (id: number) => {
        setErrors((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }

  const setError = (id: number, message: string) => {
        setErrors((prev) => ({ ...prev, [id]: message }));
      }

  const start = (id: number) => {
        setBusyId(id);
        clearError(id);
      }

  const finish = () => {
        setBusyId(null);
      }

  return { busyId, errors, start, finish, setError, clearError };
}
