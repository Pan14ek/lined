import { useState } from 'react';

/**
 * Shared "one row busy at a time, per-row error" bookkeeping for lists where
 * clicking a row action (invite, resend, toggle status, …) disables just
 * that row and shows an inline error on failure.
 */
export function useRowMutationState() {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  function clearError(id: number) {
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setError(id: number, message: string) {
    setErrors((prev) => ({ ...prev, [id]: message }));
  }

  /** Call at the start of a row action: marks it busy and clears its stale error. */
  function start(id: number) {
    setBusyId(id);
    clearError(id);
  }

  /** Call in onSettled to clear the busy state. */
  function finish() {
    setBusyId(null);
  }

  return { busyId, errors, start, finish, setError, clearError };
}
