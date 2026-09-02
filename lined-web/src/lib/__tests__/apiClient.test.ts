import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { HTTPError } from 'ky';
import {
  MockHttpError,
  getErrorStatus,
  mockDelay,
  mockNetworkDelay,
  toSearchParams,
} from '../apiClient';
import { HTTP_STATUS } from '@/test/httpStatus';
import { server } from '@/test/server';
import { useAuthStore } from '@/store/auth';
import {
  api as linedApi,
  invalidateAuthTransport,
  logoutSession,
  refreshAccessToken,
} from '../apiClient';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('MockHttpError', () => {
  it('carries the given status and a default message', () => {
    expect.assertions(2);
    const error = new MockHttpError(HTTP_STATUS.NOT_FOUND);

    expect(error.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(error.message).toBe(`Mock HTTP error ${HTTP_STATUS.NOT_FOUND}`);
  });

  it('carries a custom message when given', () => {
    expect.assertions(1);
    const error = new MockHttpError(HTTP_STATUS.CONFLICT, 'Already exists');

    expect(error.message).toBe('Already exists');
  });
});

describe('getErrorStatus', () => {
  it('reads the status from a real ky HTTPError', () => {
    expect.assertions(1);
    const response = new Response(null, { status: HTTP_STATUS.NOT_FOUND });
    const error = new HTTPError(response, new Request('http://localhost/'), {} as never);

    expect(getErrorStatus(error)).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('reads the status from a MockHttpError', () => {
    expect.assertions(1);
    expect(getErrorStatus(new MockHttpError(HTTP_STATUS.CONFLICT))).toBe(HTTP_STATUS.CONFLICT);
  });

  it('returns undefined for an unrelated error', () => {
    expect.assertions(1);
    expect(getErrorStatus(new Error('network down'))).toBeUndefined();
  });

  it('returns undefined for a non-error value', () => {
    expect.assertions(1);
    expect(getErrorStatus('nope')).toBeUndefined();
  });
});

describe('mockDelay', () => {
  it('resolves after roughly the given duration', async () => {
    expect.assertions(1);
    const start = Date.now();
    await mockDelay(10);

    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });
});

describe('mockNetworkDelay', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves immediately when VITE_MOCK_DELAY_MS is unset (the default test-mode behavior)', async () => {
    expect.assertions(1);
    const start = Date.now();
    await mockNetworkDelay();

    expect(Date.now() - start).toBeLessThan(9);
  });

  it('stays instant under Vitest even when VITE_MOCK_DELAY_MS is set, so a developer\'s local .env.local setting can never slow down the test suite', async () => {
    expect.assertions(1);
    vi.stubEnv('VITE_MOCK_DELAY_MS', '50');
    const start = Date.now();
    await mockNetworkDelay();

    expect(Date.now() - start).toBeLessThan(9);
  });

  it('resolves after roughly VITE_MOCK_DELAY_MS outside of Vitest (simulated by stubbing VITEST away)', async () => {
    expect.assertions(1);
    vi.stubEnv('VITEST', '');
    vi.stubEnv('VITE_MOCK_DELAY_MS', '10');
    const start = Date.now();
    await mockNetworkDelay();

    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });

  it('resolves immediately outside of Vitest when VITE_MOCK_DELAY_MS is set to 0', async () => {
    expect.assertions(1);
    vi.stubEnv('VITEST', '');
    vi.stubEnv('VITE_MOCK_DELAY_MS', '0');
    const start = Date.now();
    await mockNetworkDelay();

    expect(Date.now() - start).toBeLessThan(9);
  });
});

describe('toSearchParams', () => {
  it('keeps defined string/number/boolean values', () => {
    expect.assertions(1);
    expect(toSearchParams({ q: 'alex', page: 0, active: true })).toStrictEqual({
      q: 'alex',
      page: 0,
      active: true,
    });
  });

  it('drops undefined and null entries', () => {
    expect.assertions(1);
    expect(toSearchParams({ q: 'alex', from: undefined, to: null })).toStrictEqual({ q: 'alex' });
  });

  it('returns an empty object when everything is undefined/null', () => {
    expect.assertions(1);
    expect(toSearchParams({ a: undefined, b: null })).toStrictEqual({});
  });
});

describe('authenticated API transport', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    invalidateAuthTransport();
  });

  it('adds the Bearer token and never sends the legacy identity header', async () => {
    expect.assertions(3);
    server.use(
      http.get(`${BASE}/transport-probe`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer mock-token-1');
        expect(request.headers.get('x-user-id')).toBeNull();
        expect(request.credentials).toBe('include');
        return HttpResponse.json({ ok: true });
      }),
    );

    await linedApi.get('transport-probe').json<{ ok: boolean }>();
  });

  it('refreshes once for concurrent unauthorized requests and retries each request', async () => {
    expect.assertions(6);
    let refreshCount = 0;
    let firstAttempts = 0;
    let secondAttempts = 0;
    server.use(
      http.get(`${BASE}/protected-one`, ({ request }) => {
        firstAttempts += 1;
        if (firstAttempts === 1) return new HttpResponse(null, { status: 401 });
        expect(request.headers.get('authorization')).toBe('Bearer mock-token-1-refreshed');
        return HttpResponse.json({ resource: 'one' });
      }),
      http.get(`${BASE}/protected-two`, ({ request }) => {
        secondAttempts += 1;
        if (secondAttempts === 1) return new HttpResponse(null, { status: 401 });
        expect(request.headers.get('authorization')).toBe('Bearer mock-token-1-refreshed');
        return HttpResponse.json({ resource: 'two' });
      }),
      http.post(`${BASE}/auth/refresh`, async ({ request }) => {
        refreshCount += 1;
        expect(request.headers.get('x-xsrf-token')).toBe('test-csrf-token');
        await delay(10);
        return HttpResponse.json({
          accessToken: 'mock-token-1-refreshed',
          tokenType: 'Bearer',
          expiresIn: 900,
        });
      }),
    );

    const [first, second] = await Promise.all([
      linedApi.get('protected-one').json<{ resource: string }>(),
      linedApi.get('protected-two').json<{ resource: string }>(),
    ]);

    expect(refreshCount).toBe(1);
    expect(first.resource).toBe('one');
    expect(second.resource).toBe('two');
  });

  it('does not retry a persistent unauthorized response', async () => {
    expect.assertions(3);
    let protectedCount = 0;
    let refreshCount = 0;
    server.use(
      http.get(`${BASE}/always-protected`, () => {
        protectedCount += 1;
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    await expect(linedApi.get('always-protected')).rejects.toBeInstanceOf(HTTPError);
    expect(protectedCount).toBe(1);
    expect(refreshCount).toBe(1);
  });

  it.each([
    ['auth/login', () => linedApi.post('auth/login')],
    ['auth/refresh', () => refreshAccessToken()],
    ['auth/password-reset-requests', () => linedApi.post('auth/password-reset-requests')],
    ['auth/password-resets', () => linedApi.post('auth/password-resets')],
    ['auth/logout', () => logoutSession()],
  ])('does not recursively refresh a failed %s request', async (path, request) => {
    expect.assertions(2);
    let refreshCount = 0;
    server.use(
      http.post(`${BASE}/${path}`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    await expect(request()).rejects.toBeDefined();
    expect(refreshCount).toBe(0);
  });
});
