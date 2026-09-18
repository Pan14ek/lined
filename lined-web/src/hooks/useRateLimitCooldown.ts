import { useEffect, useState } from 'react';
import { getRateLimitRetryAfterSeconds } from '@/lib/apiClient';

const STORAGE_PREFIX = 'lined.rate-limit.cooldown.';

/** Keeps a server-authoritative cooldown across remounts without retrying the request. */
export const useRateLimitCooldown = (scope: string, error: unknown): number => {
  const storageKey = `${STORAGE_PREFIX}${scope}`;
  const [deadline, setDeadline] = useState(() => readDeadline(storageKey));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const retryAfter = getRateLimitRetryAfterSeconds(error);
    if (retryAfter === undefined) return;
    const nextDeadline = Date.now() + retryAfter * 1000;
    try {
      window.localStorage.setItem(storageKey, String(nextDeadline));
    } catch {
      // Private browsing and blocked storage only remove reload persistence.
    }
    const timer = window.setTimeout(() => setDeadline(nextDeadline), 0);
    return () => window.clearTimeout(timer);
  }, [error, storageKey]);

  useEffect(() => {
    if (!deadline) return undefined;
    const timer = window.setInterval(() => {
      if (Date.now() >= deadline) {
        setDeadline(null);
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Ignore unavailable storage.
        }
      } else {
        setNow(Date.now());
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, storageKey]);

  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
};

const readDeadline = (storageKey: string): number | null => {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(value) && value > Date.now() ? value : null;
  } catch {
    return null;
  }
};
