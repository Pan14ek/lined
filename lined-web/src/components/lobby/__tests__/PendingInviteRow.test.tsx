import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import type { LobbyInviteDto } from '@/types';
import { PendingInviteRow } from '../PendingInviteRow';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const invite: LobbyInviteDto = {
  id: 2,
  lobbyId: 1,
  inviterId: 1,
  inviteeId: 3,
  status: 'PENDING',
  sentAt: '2026-03-27T10:00:00Z',
  createdAt: '2026-03-27T10:00:00Z',
  updatedAt: '2026-03-27T10:00:00Z',
};

describe('PendingInviteRow', () => {
  it('resolves and renders the invitee username with the sent date', async () => {
    expect.assertions(2);
    renderWithProviders(
      <PendingInviteRow
        invite={invite}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isResending={false}
        isCancelling={false}
      />,
    );

    expect(await screen.findByText('nastia_bondar')).toBeInTheDocument();
    expect(screen.getByText('Invite sent · Mar 27, 2026')).toBeInTheDocument();
  });

  it('falls back to a numeric label if the invitee profile fails to load', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/users/:id`, () => new HttpResponse(null, { status: 404 })));
    renderWithProviders(
      <PendingInviteRow
        invite={invite}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isResending={false}
        isCancelling={false}
      />,
    );

    expect(await screen.findByText('User #3')).toBeInTheDocument();
  });

  it('calls onResend when Resend is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onResend = vi.fn();
    renderWithProviders(
      <PendingInviteRow
        invite={invite}
        onResend={onResend}
        onCancel={vi.fn()}
        isResending={false}
        isCancelling={false}
      />,
    );
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole('button', { name: 'Resend' }));

    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(
      <PendingInviteRow
        invite={invite}
        onResend={vi.fn()}
        onCancel={onCancel}
        isResending={false}
        isCancelling={false}
      />,
    );
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows a pending "Resending…" label and disables both buttons while resending', async () => {
    expect.assertions(2);
    renderWithProviders(
      <PendingInviteRow
        invite={invite}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isResending={true}
        isCancelling={false}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Resending…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows an inline error message when provided', async () => {
    expect.assertions(1);
    renderWithProviders(
      <PendingInviteRow
        invite={invite}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isResending={false}
        isCancelling={false}
        error="Couldn't resend — try again"
      />,
    );

    expect(await screen.findByText("Couldn't resend — try again")).toBeInTheDocument();
  });
});
