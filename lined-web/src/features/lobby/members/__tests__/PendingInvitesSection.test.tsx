import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import type { LobbyInviteDto } from '@/features/lobby/model';
import { PendingInvitesSection } from '../PendingInvitesSection';

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

describe('PendingInvitesSection', () => {
  it('renders a row per pending invite', () => {
    expect.assertions(1);
    renderWithProviders(
      <PendingInvitesSection lobbyId={3} invites={[invite]} isLoading={false} isError={false} />,
    );

    expect(screen.getByRole('button', { name: 'Resend' })).toBeInTheDocument();
  });

  it('shows a loading skeleton', () => {
    expect.assertions(1);
    renderWithProviders(
      <PendingInvitesSection lobbyId={3} invites={undefined} isLoading={true} isError={false} />,
    );

    expect(screen.getByTestId('pending-invites-loading')).toBeInTheDocument();
  });

  it('shows an error message when invites fail to load', () => {
    expect.assertions(1);
    renderWithProviders(
      <PendingInvitesSection lobbyId={3} invites={undefined} isLoading={false} isError={true} />,
    );

    expect(screen.getByText("Couldn't load pending invites.")).toBeInTheDocument();
  });

  it('shows "No pending invites." for an empty list', () => {
    expect.assertions(1);
    renderWithProviders(
      <PendingInvitesSection lobbyId={3} invites={[]} isLoading={false} isError={false} />,
    );

    expect(screen.getByText('No pending invites.')).toBeInTheDocument();
  });
});
