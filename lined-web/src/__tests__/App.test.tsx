import { describe, it, expect, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { App } from '../App';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

// import.meta.env.DEV/PROD are computed from Vitest's run mode; stubbing the
// underlying env vars is the supported way to flip them for a test.
describe('App — production hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
  });

  it('does not mount React Query Devtools when running in production mode', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ accessToken: 'mock-token-1', tokenType: 'Bearer', expiresIn: 900 }),
      ),
      http.get(`${BASE}/users/me`, () => HttpResponse.json(MOCK_USERS[0])),
    );
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);

    const { container } = render(<App />);
    // Let AuthBootstrap's network chain settle so no request/render is left
    // dangling into the next test.
    await waitFor(() => {
      if (screen.queryByRole('status')) throw new Error('still bootstrapping');
    });

    expect(container.querySelector('.tsqd-parent-container')).not.toBeInTheDocument();
  });
});
