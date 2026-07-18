import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { LobbyDto, LobbyInviteDto } from '@/features/lobby/model';
import type { NotificationDto } from '@/features/notifications/model';
import { NotificationInbox } from '../NotificationInbox';

const LOBBIES: LobbyDto[] = [
  { id: 1, name: 'Alex & Anastasiia', lobbyType: 'COUPLE', ownerId: 1, memberIds: [1, 2] },
];

const UNREAD_NOTIFICATION: NotificationDto = {
  id: 1,
  type: 'TASK_ASSIGNED',
  title: 'New task assigned',
  message: 'You were assigned "Plan dinner for Saturday"',
  lobbyId: 1,
  taskId: 1,
  eventId: null,
  readAt: null,
  createdAt: '2026-07-17T07:00:00Z',
  deliveries: [],
};

const READ_NOTIFICATION: NotificationDto = {
  id: 2,
  type: 'SHARED_EVENT_CREATED',
  title: 'New shared event',
  message: '"Family Dinner" was added to Johnson Family',
  lobbyId: null,
  taskId: null,
  eventId: 3,
  readAt: '2026-07-17T06:00:00Z',
  createdAt: '2026-07-17T05:00:00Z',
  deliveries: [],
};

const INVITE: LobbyInviteDto = {
  id: 1,
  lobbyId: 1,
  inviterId: 1,
  inviteeId: 2,
  status: 'PENDING',
  sentAt: '2026-07-15T10:00:00Z',
  createdAt: '2026-07-15T10:00:00Z',
  updatedAt: '2026-07-15T10:00:00Z',
};

const noop = () => {};

const inviteProps = {
  invites: undefined,
  onAcceptInvite: noop,
  onDeclineInvite: noop,
  acceptingInviteId: undefined,
  decliningInviteId: undefined,
  inviteErrors: {},
};

describe('NotificationInbox', () => {
  it('shows a loading skeleton while notifications are loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <NotificationInbox
        notifications={undefined}
        lobbies={undefined}
        isLoading
        isError={false}
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    expect(screen.getByTestId('notification-inbox-loading')).toBeInTheDocument();
  });

  it('shows an inline error message when notifications fail to load', () => {
    expect.assertions(1);
    renderWithProviders(
      <NotificationInbox
        notifications={undefined}
        lobbies={undefined}
        isLoading={false}
        isError
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    expect(screen.getByText("Couldn't load notifications.")).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', () => {
    expect.assertions(1);
    renderWithProviders(
      <NotificationInbox
        notifications={[]}
        lobbies={[]}
        isLoading={false}
        isError={false}
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });

  it('does not show the "Mark all read" button when everything is read', () => {
    expect.assertions(1);
    renderWithProviders(
      <NotificationInbox
        notifications={[READ_NOTIFICATION]}
        lobbies={[]}
        isLoading={false}
        isError={false}
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('renders each notification with its message, relative time, and lobby name', () => {
    expect.assertions(2);
    renderWithProviders(
      <NotificationInbox
        notifications={[UNREAD_NOTIFICATION]}
        lobbies={LOBBIES}
        isLoading={false}
        isError={false}
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    expect(
      screen.getByText('You were assigned "Plan dinner for Saturday"'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Alex & Anastasiia/)).toBeInTheDocument();
  });

  it('omits the lobby name when the notification has no lobbyId', () => {
    expect.assertions(1);
    renderWithProviders(
      <NotificationInbox
        notifications={[READ_NOTIFICATION]}
        lobbies={LOBBIES}
        isLoading={false}
        isError={false}
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    expect(screen.queryByText(/Alex & Anastasiia/)).not.toBeInTheDocument();
  });

  it('calls onRowClick with the notification when a row is clicked', async () => {
    expect.assertions(1);
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <NotificationInbox
        notifications={[UNREAD_NOTIFICATION]}
        lobbies={LOBBIES}
        isLoading={false}
        isError={false}
        onRowClick={onRowClick}
        onMarkAllRead={noop}
        {...inviteProps}
      />,
    );

    await user.click(screen.getByText('You were assigned "Plan dinner for Saturday"'));

    expect(onRowClick).toHaveBeenCalledWith(UNREAD_NOTIFICATION);
  });

  it('calls onMarkAllRead when "Mark all read" is clicked', async () => {
    expect.assertions(1);
    const onMarkAllRead = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <NotificationInbox
        notifications={[UNREAD_NOTIFICATION]}
        lobbies={LOBBIES}
        isLoading={false}
        isError={false}
        onRowClick={noop}
        onMarkAllRead={onMarkAllRead}
        {...inviteProps}
      />,
    );

    await user.click(screen.getByText('Mark all read'));

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('renders a pending invite above the notifications and wires accept/decline', async () => {
    expect.assertions(2);
    const onAcceptInvite = vi.fn();
    const onDeclineInvite = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <NotificationInbox
        notifications={[]}
        lobbies={LOBBIES}
        isLoading={false}
        isError={false}
        onRowClick={noop}
        onMarkAllRead={noop}
        {...inviteProps}
        invites={[INVITE]}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
      />,
    );
    await screen.findByTestId('invite-card');

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onAcceptInvite).toHaveBeenCalledWith(INVITE.id, INVITE.lobbyId);
    expect(onDeclineInvite).toHaveBeenCalledWith(INVITE.id);
  });
});
