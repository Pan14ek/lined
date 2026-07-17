import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { LobbyNotificationsCard } from '../LobbyNotificationsCard';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('LobbyNotificationsCard', () => {
  it('shows a loading skeleton before preferences load', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyNotificationsCard lobbyId={1} />);

    expect(screen.getByTestId('lobby-notifications-card-loading')).toBeInTheDocument();
  });

  it('renders all three toggles once loaded', async () => {
    expect.assertions(3);
    renderWithProviders(<LobbyNotificationsCard lobbyId={1} />);

    expect(await screen.findByText('New events in this lobby')).toBeInTheDocument();
    expect(screen.getByText('Task updates')).toBeInTheDocument();
    expect(screen.getByText('Free slot notifications')).toBeInTheDocument();
  });

  it('optimistically flips a toggle and PATCHes only that field', async () => {
    expect.assertions(2);
    let receivedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${BASE}/lobbies/:lobbyId/notification-preferences`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          lobbyId: 1,
          newEventsEnabled: true,
          taskUpdatesEnabled: true,
          freeSlotsEnabled: false,
          ...receivedBody,
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyNotificationsCard lobbyId={1} />);

    const switches = await screen.findAllByRole('switch');
    await user.click(switches[0]!);

    expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(receivedBody).toEqual({ newEventsEnabled: false }));
  });

  it('rolls back the toggle and shows an inline error on failure', async () => {
    expect.assertions(2);
    server.use(
      http.patch(
        `${BASE}/lobbies/:lobbyId/notification-preferences`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyNotificationsCard lobbyId={1} />);

    const switches = await screen.findAllByRole('switch');
    await user.click(switches[0]!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save that preference — please try again',
    );
    await waitFor(() => expect(switches[0]).toHaveAttribute('aria-checked', 'true'));
  });
});
