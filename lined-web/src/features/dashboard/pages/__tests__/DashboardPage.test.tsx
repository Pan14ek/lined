import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { DashboardPage } from '../DashboardPage';
import { useAuthStore } from '@/store/auth';
import { useCreateMenuStore } from '@/store/createMenu';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
  });

  it('renders the greeting, lobby cards, upcoming events, and my tasks', async () => {
    expect.assertions(5);
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/good (morning|afternoon|evening), alex_johnson/i)).toBeInTheDocument();
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
    server.use(http.get(`${BASE}/tasks/mine`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/couldn't load your tasks/i)).toBeInTheDocument();
    expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
  });

  it('renders the pending invites banner above "My Lobbies"', async () => {
    expect.assertions(2);
    renderWithProviders(<DashboardPage />);

    const invitesHeading = await screen.findByText('Pending Invites · 3');
    const lobbiesHeading = await screen.findByText('My Lobbies');
    expect(invitesHeading).toBeInTheDocument();
    expect(
      invitesHeading.compareDocumentPosition(lobbiesHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe('first-run hero', () => {
    beforeEach(() => {
      server.use(
        http.get(`${BASE}/lobbies/mine`, () => HttpResponse.json([])),
        http.get(`${BASE}/lobby-invites/mine`, () => HttpResponse.json([])),
      );
    });

    it('renders the welcome hero instead of "My Lobbies" when there are no lobbies or invites', async () => {
      expect.assertions(2);
      renderWithProviders(<DashboardPage />);

      expect(await screen.findByText(/welcome to lined/i)).toBeInTheDocument();
      expect(screen.queryByText('My Lobbies')).not.toBeInTheDocument();
    });

    it('opens the create-lobby overlay with the clicked type preselected', async () => {
      expect.assertions(2);
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />);

      await user.click(await screen.findByText('Family'));

      expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
      expect(useCreateMenuStore.getState().lobbyTypeInitial).toBe('FAMILY');
    });

    it('opens the create-lobby overlay with no type preselected from the primary CTA', async () => {
      expect.assertions(2);
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />);

      await user.click(await screen.findByRole('button', { name: /create your first lobby/i }));

      expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
      expect(useCreateMenuStore.getState().lobbyTypeInitial).toBeNull();
    });
  });

  it('does not render the hero when lobbies exist', async () => {
    expect.assertions(1);
    renderWithProviders(<DashboardPage />);

    await screen.findByText('My Lobbies');
    expect(screen.queryByText(/welcome to lined/i)).not.toBeInTheDocument();
  });

  it('renders the pending invites banner instead of the hero when the account has invites but no lobbies', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/lobbies/mine`, () => HttpResponse.json([])));
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Pending Invites · 3')).toBeInTheDocument();
    expect(screen.queryByText(/welcome to lined/i)).not.toBeInTheDocument();
  });
});
