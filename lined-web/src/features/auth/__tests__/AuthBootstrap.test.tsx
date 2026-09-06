import { describe, expect, it, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { AuthBootstrap } from '../AuthBootstrap';
import { useAuthStore } from '@/store/auth';
import { server } from '@/test/server';
import { createTestQueryClient, renderWithProviders, screen, waitFor } from '@/test/utils';
import { invalidateAuthTransport, refreshAccessToken } from '@/lib/apiClient';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { QUERY_KEYS } from '@/features/users/lib/constants';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('AuthBootstrap', () => {
  beforeEach(() => {
    invalidateAuthTransport();
    useAuthStore.setState({ accessToken: null, status: 'bootstrapping' });
  });

  it('restores a browser session with a refreshed access token', async () => {
    expect.assertions(3);
    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ accessToken: 'mock-token-1', tokenType: 'Bearer', expiresIn: 900 }),
      ),
      http.get(`${BASE}/users/me`, () => HttpResponse.json(MOCK_USERS[0])),
    );

    renderWithProviders(
      <AuthBootstrap><div>Application</div></AuthBootstrap>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findByText('Application')).toBeInTheDocument();
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'mock-token-1',
      status: 'authenticated',
    });
  });

  it('finishes as unauthenticated when browser session restoration fails', async () => {
    expect.assertions(2);
    server.use(
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    );

    renderWithProviders(
      <AuthBootstrap><div>Sign In Application</div></AuthBootstrap>,
    );

    expect(await screen.findByText('Sign In Application')).toBeInTheDocument();
    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });

  it('clears the full user-scoped query cache — not just the token — when a runtime refresh fails mid-session', async () => {
    expect.assertions(4);
    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ accessToken: 'mock-token-1', tokenType: 'Bearer', expiresIn: 900 }),
      ),
      http.get(`${BASE}/users/me`, () => HttpResponse.json(MOCK_USERS[0])),
    );
    const queryClient = createTestQueryClient();

    renderWithProviders(<AuthBootstrap><div>Application</div></AuthBootstrap>, { queryClient });
    await screen.findByText('Application');

    // Simulate User A's session data having entered the cache while browsing.
    queryClient.setQueryData(['lobbies', 42], { id: 42, name: 'Family Makieiev' });
    expect(queryClient.getQueryData(QUERY_KEYS.currentUser)).toBeDefined();

    // The refresh cookie is now revoked/expired server-side (runtime session loss, not bootstrap).
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })));
    await expect(refreshAccessToken()).rejects.toBeDefined();

    await waitFor(() => {
      if (useAuthStore.getState().status !== 'unauthenticated') throw new Error('not cleared yet');
    });
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
