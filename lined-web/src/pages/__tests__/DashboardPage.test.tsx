import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { DashboardPage } from '../DashboardPage';
import { useAuthStore } from '@/store/auth';
import { useCreateMenuStore } from '@/store/createMenu';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
  });

  it('renders the greeting, lobby cards, upcoming events, and my tasks', async () => {
    expect.assertions(5);
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/alex_johnson/)).toBeInTheDocument();
    expect(screen.getByText('My Lobbies')).toBeInTheDocument();
    expect((await screen.findAllByText('Alex & Anastasiia')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
    expect(await screen.findByText('Book restaurant reservation')).toBeInTheDocument();
  });

  it('shows the free-slot banner when a qualifying mutual slot exists', async () => {
    expect.assertions(1);
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Free time found!')).toBeInTheDocument();
  });

  it('opens the reserve-slot overlay pre-filled with the banner slot when "Plan something" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    await user.click(await screen.findByRole('button', { name: /plan something/i }));

    expect(useCreateMenuStore.getState().reserveSlotInitial).toMatchObject({ lobbyId: 1 });
  });

  it('hides the free-slot banner when the lobby has no free slots', async () => {
    expect.assertions(2);
    server.use(
      http.get(`${BASE}/lobbies/:id/free-slots`, () => HttpResponse.json([])),
    );
    renderWithProviders(<DashboardPage />);

    expect((await screen.findAllByText('Alex & Anastasiia')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Free time found!')).not.toBeInTheDocument();
  });

  it('keeps the rest of the page working when the tasks request fails', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/tasks/mine`, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/couldn't load your tasks/i)).toBeInTheDocument();
    expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
  });
});
