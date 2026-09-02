import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { useAuthStore } from '@/store/auth';
import { NotificationsCard } from '../NotificationsCard';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('NotificationsCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
  });

  it('shows a loading skeleton before preferences load', () => {
    expect.assertions(1);
    renderWithProviders(<NotificationsCard />);

    expect(screen.getByTestId('notifications-card-loading')).toBeInTheDocument();
  });

  it('renders all five toggles once loaded, reflecting the fetched values', async () => {
    expect.assertions(5);
    renderWithProviders(<NotificationsCard />);

    expect(await screen.findByText('New shared events')).toBeInTheDocument();
    expect(screen.getByText('Task assigned to me')).toBeInTheDocument();
    expect(screen.getByText('Free slot detected')).toBeInTheDocument();
    expect(screen.getByText('Event reminders')).toBeInTheDocument();
    expect(screen.getByText('Email digests')).toBeInTheDocument();
  });

  it('optimistically flips a toggle and PATCHes only that field', async () => {
    expect.assertions(2);
    let receivedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${BASE}/notifications/preferences`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          sharedEventsEnabled: true,
          taskAssignedEnabled: true,
          freeSlotsEnabled: true,
          eventRemindersEnabled: true,
          emailDigestsEnabled: false,
          ...receivedBody,
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationsCard />);

    const switches = await screen.findAllByRole('switch');
    await user.click(switches[0]!);

    expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(receivedBody).toEqual({ sharedEventsEnabled: false }));
  });

  it('rolls back the toggle and shows an inline error on failure', async () => {
    expect.assertions(2);
    server.use(
      http.patch(`${BASE}/notifications/preferences`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationsCard />);

    const switches = await screen.findAllByRole('switch');
    await user.click(switches[0]!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save that preference — please try again',
    );
    await waitFor(() => expect(switches[0]).toHaveAttribute('aria-checked', 'true'));
  });
});
