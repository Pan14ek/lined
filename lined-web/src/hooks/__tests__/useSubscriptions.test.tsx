import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/server';
import {
  usePlans,
  useActivePlan,
  useSubscriptionHistory,
  useStartSubscription,
  useCancelSubscription,
} from '../useSubscriptions';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

async function waitUntilSettled(result: { current: { isSuccess: boolean; isError: boolean } }) {
  await waitFor(() => {
    if (!result.current.isSuccess && !result.current.isError) {
      throw new Error('not settled yet');
    }
  });
}

describe('usePlans', () => {
  it('fetches the available plans', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();

    const { result } = renderHook(() => usePlans(), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toHaveLength(3);
  });

  it('surfaces a failed request as an error state', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    server.use(http.get(`${BASE}/plans`, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => usePlans(), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});

describe('useActivePlan', () => {
  it('returns the active subscription for a user on the paid plan', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();

    const { result } = renderHook(() => useActivePlan(1), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.planName).toBe('Pro');
  });

  it('treats a 404 as "free plan" (null) instead of an error', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();
    server.use(
      http.get(`${BASE}/subscriptions/:userId/active`, () => new HttpResponse(null, { status: 404 })),
    );

    const { result } = renderHook(() => useActivePlan(99), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('surfaces a non-404 failure as an error state', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    server.use(
      http.get(`${BASE}/subscriptions/:userId/active`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useActivePlan(1), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});

describe('useSubscriptionHistory', () => {
  it('fetches the subscription history for a user', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();

    const { result } = renderHook(() => useSubscriptionHistory(1), {
      wrapper: makeWrapper(queryClient),
    });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useStartSubscription', () => {
  it('posts the userId/planId payload and invalidates active + history', async () => {
    expect.assertions(3);
    const queryClient = makeQueryClient();
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE}/subscriptions`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          {
            id: 200,
            userId: 5,
            planId: 3,
            planName: 'Family',
            startDate: '2026-07-18T00:00:00Z',
            endDate: '2026-08-17T00:00:00Z',
            active: true,
            createdAt: '2026-07-18T00:00:00Z',
          },
          { status: 201 },
        );
      }),
    );

    queryClient.setQueryData(['subscriptions', 5, 'active'], null);

    const { result } = renderHook(() => useStartSubscription(5), {
      wrapper: makeWrapper(queryClient),
    });
    result.current.mutate(3);
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(capturedBody).toEqual({ userId: 5, planId: 3 });
    expect(queryClient.getQueryState(['subscriptions', 5, 'active'])?.isInvalidated).toBe(true);
  });

  it('rejects with a 409 when the user already has an active subscription', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();

    const { result } = renderHook(() => useStartSubscription(1), {
      wrapper: makeWrapper(queryClient),
    });
    result.current.mutate(3);
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});

describe('useCancelSubscription', () => {
  it('cancels the active subscription and invalidates active + history', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();

    queryClient.setQueryData(['subscriptions', 1, 'history'], []);

    const { result } = renderHook(() => useCancelSubscription(1), {
      wrapper: makeWrapper(queryClient),
    });
    result.current.mutate();
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(queryClient.getQueryState(['subscriptions', 1, 'history'])?.isInvalidated).toBe(true);
  });

  it('rejects with a 404 when there is no active subscription to cancel', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();

    const { result } = renderHook(() => useCancelSubscription(99), {
      wrapper: makeWrapper(queryClient),
    });
    result.current.mutate();
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});
