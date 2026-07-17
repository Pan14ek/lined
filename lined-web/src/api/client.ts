import ky from 'ky';
import { useAuthStore } from '@/store/auth';

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        const userId = useAuthStore.getState().userId;
        if (userId !== null) {
          request.headers.set('X-User-Id', String(userId));
        }
      },
    ],
  },
});

/**
 * Drops `undefined`/`null` entries before handing params to ky's
 * `searchParams`, which otherwise serializes them as the literal string
 * "undefined"/"null" in the query string.
 */
export function toSearchParams(
  params: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result;
}

/** DELETE (or other void-response request) that discards the empty body. */
export function requestVoid(
  method: 'delete' | 'post',
  url: string,
): Promise<void> {
  return api[method](url).then(() => undefined);
}
