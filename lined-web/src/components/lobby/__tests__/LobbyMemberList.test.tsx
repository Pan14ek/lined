import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/test/data';
import { useAuthStore } from '@/store/auth';
import { LobbyMemberList } from '../LobbyMemberList';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // id 1, ownerId 1, memberIds [1, 2] (Alex owner, nastia_k member)

describe('LobbyMemberList', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1, token: 'token' });
  });

  it('shows a loading state while members are being fetched', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(screen.getByTestId('lobby-members-loading')).toBeInTheDocument();
  });

  it('renders the member count, role badges, and "that\'s you" for the current user', async () => {
    expect.assertions(4);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Members · 2')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText("That's you")).toBeInTheDocument();
  });

  it('shows an error message when a member profile fails to load', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/users/:id`, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(
      await screen.findByText("Couldn't load members. Try again later."),
    ).toBeInTheDocument();
  });

  it('shows owner-only management actions and the Pending Invites section for the owner', async () => {
    expect.assertions(3);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    expect(screen.getByRole('button', { name: 'Make owner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(await screen.findByText('Pending Invites')).toBeInTheDocument();
  });

  it('hides management actions and the Pending Invites section for a non-owner viewer', async () => {
    expect.assertions(3);
    useAuthStore.setState({ userId: 2, token: 'token' });
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText("That's you")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Invites')).not.toBeInTheDocument();
  });

  it('resolves and renders the pending invite for the owner', async () => {
    expect.assertions(2);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText('nastia_bondar')).toBeInTheDocument();
    expect(screen.getByText('Invite sent · Mar 27, 2026')).toBeInTheDocument();
  });

  it('shows a friendly empty state when there are no pending invites', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobbies/:lobbyId/invites`, () => HttpResponse.json([])));
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText('No pending invites.')).toBeInTheDocument();
  });

  it('shows an error message when pending invites fail to load', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/lobbies/:lobbyId/invites`, () => new HttpResponse(null, { status: 500 })),
    );
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText("Couldn't load pending invites.")).toBeInTheDocument();
  });

  it('resends a pending invite', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole('button', { name: 'Resend' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resend' })).toBeEnabled();
    });
  });

  it('shows an inline error when resending an invite fails', async () => {
    expect.assertions(1);
    server.use(
      http.post(
        `${BASE}/lobbies/:lobbyId/invites/:inviteId/resend`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole('button', { name: 'Resend' }));

    expect(await screen.findByText("Couldn't resend — try again")).toBeInTheDocument();
  });

  it('cancels a pending invite without leaving it stuck in a pending state', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    });
  });

  it('opens a confirm dialog and PATCHes ownership when "Make owner" is confirmed', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole('button', { name: 'Make owner' }));
    expect(
      screen.getByText(
        'Make @nastia_k the owner of "Alex & Anastasiia"? You will become a regular member.',
      ),
    ).toBeInTheDocument();

    const [, confirmButton] = screen.getAllByRole('button', { name: 'Make owner' });
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Make owner' })).not.toBeInTheDocument();
    });
  });

  it('shows an inline error and keeps the dialog open when the make-owner PATCH fails', async () => {
    expect.assertions(1);
    server.use(http.patch(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole('button', { name: 'Make owner' }));
    const [, confirmButton] = screen.getAllByRole('button', { name: 'Make owner' });
    await user.click(confirmButton!);

    expect(
      await screen.findByText('Could not transfer ownership — please try again'),
    ).toBeInTheDocument();
  });

  it('opens a confirm dialog and removes the member when "Remove" is confirmed', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const [, confirmButton] = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Remove member' })).not.toBeInTheDocument();
    });
  });

  it('shows an inline error and keeps the dialog open when removing a member fails', async () => {
    expect.assertions(1);
    server.use(
      http.delete(
        `${BASE}/lobbies/:lobbyId/members/:userId`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const [, confirmButton] = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(confirmButton!);

    expect(
      await screen.findByText('Could not remove this member — please try again'),
    ).toBeInTheDocument();
  });
});
