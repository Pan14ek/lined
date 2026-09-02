import ky, { HTTPError } from 'ky';
import { useAuthStore } from '@/store/auth';
import type { LoginResponseDto } from '@/features/auth/model';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const AUTH_REFRESH_PATH = '/auth/refresh';
const AUTH_LOGOUT_PATH = '/auth/logout';
const AUTH_CSRF_PATH = '/auth/csrf';
const AUTH_LOGIN_PATH = '/auth/login';
const PASSWORD_RESET_PATHS = ['/password-reset-requests', '/password-resets'];

/** Whether feature api/index.ts modules should serve dev.ts instead of prod.ts. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Thrown by dev.ts mocks to stand in for a failed HTTP response. */
export class MockHttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Mock HTTP error ${status}`);
    this.status = status;
  }
}

/** Extracts a status code from either a real ky HTTPError or a MockHttpError. */
export const getErrorStatus = (error: unknown): number | undefined => {
  if (error instanceof HTTPError) return error.response.status;
  if (error instanceof MockHttpError) return error.status;
  return undefined;
};

/** Simulates network latency in dev.ts mocks. */
export const mockDelay = (ms = 250): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Opt-in artificial latency for MSW GET handlers. */
export const mockNetworkDelay = (): Promise<void> => {
  if (import.meta.env.VITEST) return Promise.resolve();
  const ms = Number(import.meta.env.VITE_MOCK_DELAY_MS ?? 0);
  return ms > 0 ? mockDelay(ms) : Promise.resolve();
};

type AuthContext = { skipAuthHooks?: boolean };

let refreshInFlight: Promise<string> | null = null;
let csrfInFlight: Promise<string> | null = null;
let csrfToken: string | null = null;
let transportGeneration = 0;

const isExcludedFromRefresh = (url: string): boolean => {
  const path = new URL(url).pathname;
  return [
    AUTH_LOGIN_PATH,
    AUTH_REFRESH_PATH,
    AUTH_LOGOUT_PATH,
    AUTH_CSRF_PATH,
    ...PASSWORD_RESET_PATHS,
  ].some((excluded) => path.endsWith(excluded));
};

export const initializeCsrf = async (): Promise<void> => {
  if (csrfToken) return;

  if (!csrfInFlight) {
    csrfInFlight = api
      .get('auth/csrf')
      .json<{ token: string }>()
      .then(({ token }) => {
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfInFlight = null;
      });
  }

  await csrfInFlight;
};

/** Invalidates volatile transport state after logout or failed bootstrap. */
export const invalidateAuthTransport = (): void => {
  transportGeneration += 1;
  csrfToken = null;
};

/** Refreshes the access token once for all callers waiting on the same session. */
export const refreshAccessToken = (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight;
  const generation = transportGeneration;

  refreshInFlight = (async () => {
    await initializeCsrf();
    const token = csrfToken;
    if (!token) throw new Error('CSRF token initialization returned no token.');
    const response = await api
      .post('auth/refresh', {
        headers: { 'X-XSRF-TOKEN': token },
      })
      .json<LoginResponseDto>();

    if (generation !== transportGeneration) {
      throw new Error('Authentication session was cleared during refresh.');
    }
    useAuthStore.getState().setAccessToken(response.accessToken);
    return response.accessToken;
  })()
    .catch((error: unknown) => {
      useAuthStore.getState().clearAuthentication();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

/** Calls current-session logout using the HttpOnly refresh cookie. */
export const logoutSession = async (): Promise<void> => {
  await initializeCsrf();
  const token = csrfToken;
  if (!token) throw new Error('CSRF token initialization returned no token.');
  await api.post('auth/logout', {
    headers: { 'X-XSRF-TOKEN': token },
  });
};

export const api = ky.create({
  prefixUrl: API_BASE_URL,
  credentials: 'include',
  hooks: {
    beforeRequest: [
      (request, options) => {
        const context = options.context as AuthContext;
        if (context.skipAuthHooks) return;
        const accessToken = useAuthStore.getState().accessToken;
        if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
      },
    ],
    afterResponse: [async (request, options, response, state) => {
      const context = options.context as AuthContext;
      if (
        context.skipAuthHooks ||
        response.status !== 401 ||
        state.retryCount > 0 ||
        isExcludedFromRefresh(request.url)
      ) {
        return undefined;
      }

      const accessToken = await refreshAccessToken();
      const headers = new Headers(request.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      return ky.retry({ request: new Request(request, { headers }), code: 'AUTH_REFRESHED' });
    }],
  },
});

/** Drops undefined/null entries before handing params to ky. */
export const toSearchParams = (
  params: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> => {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result;
};

/** DELETE (or other void-response request) that discards the empty body. */
export const requestVoid = async (method: 'delete' | 'post', url: string): Promise<void> => {
  return api[method](url).then(() => undefined);
};
