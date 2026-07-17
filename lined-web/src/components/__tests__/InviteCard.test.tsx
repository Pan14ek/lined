import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import type { LobbyInviteDto } from '@/types';
import { InviteCard } from '../InviteCard';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const invite: LobbyInviteDto = {
  id: 1,
  lobbyId: 3,
  inviterId: 1,
  inviteeId: 2,
  status: 'PENDING',
  sentAt: '2026-07-15T10:00:00Z',
  createdAt: '2026-07-15T10:00:00Z',
  updatedAt: '2026-07-15T10:00:00Z',
};

describe('InviteCard', () => {
  it('renders the inviter, lobby name, member count, and relative sent time', async () => {
    expect.assertions(2);
    renderWithProviders(
      <InviteCard
        invite={invite}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        isAccepting={false}
        isDeclining={false}
      />,
    );

    expect(await screen.findByText(/alex_johnson invited you to/)).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
  });

  it('calls onAccept and onDecline when their buttons are clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    renderWithProviders(
      <InviteCard
        invite={invite}
        onAccept={onAccept}
        onDecline={onDecline}
        isAccepting={false}
        isDeclining={false}
      />,
    );
    await screen.findByText('Weekend Crew');

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('disables and relabels both buttons while accepting', async () => {
    expect.assertions(2);
    renderWithProviders(
      <InviteCard
        invite={invite}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        isAccepting={true}
        isDeclining={false}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Accepting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });

  it('disables and relabels both buttons while declining', async () => {
    expect.assertions(2);
    renderWithProviders(
      <InviteCard
        invite={invite}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        isAccepting={false}
        isDeclining={true}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Declining…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
  });

  it('shows an inline error message when provided', async () => {
    expect.assertions(1);
    renderWithProviders(
      <InviteCard
        invite={invite}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        isAccepting={false}
        isDeclining={false}
        error="This invite is no longer valid"
      />,
    );

    expect(await screen.findByText('This invite is no longer valid')).toBeInTheDocument();
  });

  it('falls back to generic lobby text when the lobby fetch fails', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: 404 })));
    renderWithProviders(
      <InviteCard
        invite={invite}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        isAccepting={false}
        isDeclining={false}
      />,
    );

    expect(await screen.findByText(/invited you to/)).toHaveTextContent('a lobby');
  });
});
