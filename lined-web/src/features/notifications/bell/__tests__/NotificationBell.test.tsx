import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { useAuthStore } from '@/store/auth';
import { useCalendarStore } from '@/store/calendar';
import { NotificationBell } from '../NotificationBell';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const renderBell = () => {
  return renderWithProviders(
    <>
      <NotificationBell />
      <LocationDisplay />
    </>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
    useCalendarStore.setState({ selectedEventId: null });
  });

  it('shows the count of unread notifications as a badge', async () => {
    expect.assertions(1);
    renderBell();

    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('caps the badge at "9+" once unread count exceeds nine', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/notifications/mine`, () =>
        HttpResponse.json(
          Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            type: 'TASK_ASSIGNED',
            title: 'New task assigned',
            message: `Task ${i + 1}`,
            lobbyId: 1,
            taskId: i + 1,
            eventId: null,
            readAt: null,
            createdAt: '2026-07-17T07:00:00Z',
            deliveries: [],
          })),
        ),
      ),
    );
    renderBell();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('does not show a badge when there are no unread notifications', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/notifications/mine`, () => HttpResponse.json([])));
    renderBell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens the inbox listing every notification', async () => {
    expect.assertions(2);
    renderBell();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(
      await screen.findByText('You were assigned "Plan dinner for Saturday"'),
    ).toBeInTheDocument();
    expect(screen.getByText('"Family Dinner" was added to Johnson Family')).toBeInTheDocument();
  });

  it('marks an unread task notification read and navigates to the lobby tasks tab', async () => {
    expect.assertions(2);
    let readId: number | undefined;
    server.use(
      http.patch(`${BASE}/notifications/:id/read`, ({ params }) => {
        readId = Number(params['id']);
        return HttpResponse.json({ id: readId, readAt: '2026-07-17T08:00:00Z' });
      }),
    );
    renderBell();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));
    await user.click(
      await screen.findByText('You were assigned "Plan dinner for Saturday"'),
    );

    await waitFor(() => expect(readId).toBe(1));
    expect(await screen.findByTestId('location')).toHaveTextContent('/lobbies/1?tab=tasks');
  });

  it('navigates to the calendar and selects the event for a shared-event notification, without re-marking an already-read one', async () => {
    expect.assertions(3);
    let readCalled = false;
    server.use(
      http.patch(`${BASE}/notifications/:id/read`, () => {
        readCalled = true;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    renderBell();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));
    await user.click(
      await screen.findByText('"Family Dinner" was added to Johnson Family'),
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/calendar'),
    );
    expect(useCalendarStore.getState().selectedEventId).toBe(3);
    expect(readCalled).toBe(false);
  });

  it('marks every unread notification read when "Mark all read" is clicked', async () => {
    expect.assertions(1);
    const readIds: number[] = [];
    server.use(
      http.patch(`${BASE}/notifications/:id/read`, ({ params }) => {
        readIds.push(Number(params['id']));
        return HttpResponse.json({ id: Number(params['id']), readAt: '2026-07-17T08:00:00Z' });
      }),
    );
    renderBell();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));
    await user.click(await screen.findByText('Mark all read'));

    await waitFor(() => expect(readIds.sort()).toEqual([1, 3]));
  });

  it('shows an inline error state when the inbox fails to load', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/notifications/mine`, () => new HttpResponse(null, { status: 500 })),
    );
    renderBell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText("Couldn't load notifications.")).toBeInTheDocument();
  });

  it('lists pending invites above the notifications with working accept/decline', async () => {
    expect.assertions(2);
    renderBell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect((await screen.findAllByTestId('invite-card')).length).toBe(3);

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0]!);

    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/lobbies\/\d+$/);
  });

  it('declines an invite from the dropdown and removes its card', async () => {
    expect.assertions(1);
    renderBell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findAllByTestId('invite-card');

    await user.click(screen.getAllByRole('button', { name: 'Decline' })[0]!);

    await waitFor(() => expect(screen.getAllByTestId('invite-card').length).toBe(2));
  });
});
