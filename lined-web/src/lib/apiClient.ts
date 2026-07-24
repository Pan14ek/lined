import ky, { HTTPError } from 'ky';
import {useAuthStore} from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

/** Whether feature api/index.ts modules should serve dev.ts (mock data) instead of prod.ts. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Thrown by dev.ts mocks to stand in for a failed HTTP response (checked via `getErrorStatus`). */
export class MockHttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Mock HTTP error ${status}`);
    this.status = status;
  }
}

/** Extracts an HTTP status code from either a real ky `HTTPError` or a `MockHttpError`. */
export const getErrorStatus = (error: unknown): number | undefined => {
  if (error instanceof HTTPError) return error.response.status;
  if (error instanceof MockHttpError) return error.status;
  return undefined;
}

/** Simulates network latency in dev.ts mocks. */
export const mockDelay = (ms = 250): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opt-in artificial latency for MSW GET handlers, so skeletons are visible
 * in dev. Controlled by VITE_MOCK_DELAY_MS (see .env.example) — a no-op
 * unless set. Hard-disabled under Vitest regardless of that setting
 * (`import.meta.env.VITEST`), since a developer's local delay must never
 * slow down the test suite — Vite's dotenv loader does *not* skip
 * `.env.local` in test mode, so this can't rely on that alone.
 */
export const mockNetworkDelay = (): Promise<void> => {
  if (import.meta.env.VITEST) return Promise.resolve();
  const ms = Number(import.meta.env.VITE_MOCK_DELAY_MS ?? 0);
  return ms > 0 ? mockDelay(ms) : Promise.resolve();
}

export const api = ky.create({
    prefixUrl: API_BASE_URL,
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
export const toSearchParams = (
    params: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> => {
    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) result[key] = value;
    }
    return result;
}

/** DELETE (or other void-response request) that discards the empty body. */
export const requestVoid = async (
    method: 'delete' | 'post',
    url: string,
): Promise<void> => {
    return api[method](url).then(() => undefined);
}
