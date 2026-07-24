import { useEffect, useState } from 'react';

/**
 * Returns true once `isLoading` has stayed true for longer than `timeoutMs`.
 * Used to fall back to an error+retry state instead of shimmering forever
 * when a query never resolves.
 */
export const useQueryStall = (isLoading: boolean, timeoutMs = 10_000): boolean => {
  const [stalled, setStalled] = useState(false);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);

  // Reset for each new loading cycle by adjusting state during render
  // (see react.dev "You Might Not Need an Effect" — resetting state on prop change).
  if (isLoading !== prevIsLoading) {
    setPrevIsLoading(isLoading);
    setStalled(false);
  }

  useEffect(() => {
    if (!isLoading) return undefined;

    const timer = setTimeout(() => setStalled(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return isLoading && stalled;
};
