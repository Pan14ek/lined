import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '@/store/auth';
import { useCreateMenuStore } from '@/store/createMenu';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const renderSidebar = () => {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Sidebar />} />
      <Route path="/sign-in" element={<div>Sign In Page</div>} />
    </Routes>,
    { initialEntries: ['/'] },
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    useCreateMenuStore.setState({ isCreateLobbyOpen: false });
  });

  it('renders the signed-in user lobbies with type-coloured dots', async () => {
    expect.assertions(3);
    renderSidebar();

    expect(await screen.findByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.getByText('Johnson Family')).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
  });

  it('renders the current user footer from the API', async () => {
    expect.assertions(2);
    renderSidebar();

    expect(await screen.findByText('alex_johnson')).toBeInTheDocument();
    expect(screen.getByText('alex@lined.app')).toBeInTheDocument();
  });

  it('shows loading placeholders before lobby data resolves', async () => {
    expect.assertions(2);
    server.use(
      http.get(`${BASE}/lobbies/mine`, async () => {
        await delay(50);
        return HttpResponse.json(MOCK_LOBBIES);
      }),
    );
    renderSidebar();

    expect(screen.getByTestId('lobbies-loading')).toBeInTheDocument();
    await waitFor(() => {
      if (screen.queryByTestId('lobbies-loading')) {
        throw new Error('lobbies are still loading');
      }
    });
    expect(screen.queryByTestId('lobbies-loading')).not.toBeInTheDocument();
  });

  it('shows an empty state with a "+ New" affordance when there are no lobbies', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/lobbies/mine`, () => HttpResponse.json([])));
    renderSidebar();

    expect(await screen.findByText(/no lobbies yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '+ New' }).length).toBeGreaterThan(0);
  });

  it('does not crash and renders no user info when the user fetch fails', async () => {
    expect.assertions(2);
    server.use(
      http.get(`${BASE}/users/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND })),
    );
    renderSidebar();

    expect(await screen.findByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.queryByText('alex@lined.app')).not.toBeInTheDocument();
  });

  it('opens the create-lobby UI store when "+ New" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText('Alex & Anastasiia');

    await user.click(screen.getByRole('button', { name: '+ New' }));

    expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
  });

  it('signs out and redirects to /sign-in when the sign-out button is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText('alex_johnson');

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
