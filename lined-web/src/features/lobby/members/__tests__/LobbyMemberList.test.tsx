import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { useAuthStore } from '@/store/auth';
import {
  ROLES,
  TEST_IDS,
  NUMBERS,
  MEMBER_CARD_TEXT,
  PENDING_INVITE_TEXT,
  LOBBY_MEMBER_LIST_TEXT,
} from '@/test/lobbyMemberContent';
import { LobbyMemberList } from '../LobbyMemberList';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // id 1, ownerId 1, memberIds [1, 2] (Alex owner, nastia_k member)

describe('LobbyMemberList', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
  });

  it('shows a loading state while members are being fetched', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(screen.getByTestId(TEST_IDS.lobbyMembersLoading)).toBeInTheDocument();
  });

  it('renders the member count, role badges, and "that\'s you" for the current user', async () => {
    expect.assertions(4);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText(MEMBER_CARD_TEXT.ownerBadge)).toBeInTheDocument();
    expect(
      screen.getByText(LOBBY_MEMBER_LIST_TEXT.membersHeading(NUMBERS.aliceAndAnastasiiaMemberCount)),
    ).toBeInTheDocument();
    expect(screen.getByText(MEMBER_CARD_TEXT.memberBadge)).toBeInTheDocument();
    expect(screen.getByText(MEMBER_CARD_TEXT.thatsYou)).toBeInTheDocument();
  });

  it('shows an error message when a member profile fails to load', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/users/:id`, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText(LOBBY_MEMBER_LIST_TEXT.loadMembersError)).toBeInTheDocument();
  });

  it('shows owner-only management actions and the Pending Invites section for the owner', async () => {
    expect.assertions(3);
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    expect(
      screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(LOBBY_MEMBER_LIST_TEXT.pendingInvitesHeading),
    ).toBeInTheDocument();
  });

  it('hides management actions and the Pending Invites section for a non-owner viewer', async () => {
    expect.assertions(3);
    useAuthStore.setState({ userId: 2 });
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText(MEMBER_CARD_TEXT.thatsYou)).toBeInTheDocument();
    expect(
      screen.queryByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(LOBBY_MEMBER_LIST_TEXT.pendingInvitesHeading),
    ).not.toBeInTheDocument();
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

    expect(await screen.findByText(LOBBY_MEMBER_LIST_TEXT.noPendingInvites)).toBeInTheDocument();
  });

  it('shows an error message when pending invites fail to load', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/lobbies/:lobbyId/invites`, () => new HttpResponse(null, { status: 500 })),
    );
    renderWithProviders(<LobbyMemberList lobby={lobby} />);

    expect(await screen.findByText(LOBBY_MEMBER_LIST_TEXT.loadInvitesError)).toBeInTheDocument();
  });

  it('resends a pending invite', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole(ROLES.button, { name: PENDING_INVITE_TEXT.resendButtonName }));

    await waitFor(() => {
      expect(
        screen.getByRole(ROLES.button, { name: PENDING_INVITE_TEXT.resendButtonName }),
      ).toBeEnabled();
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

    await user.click(screen.getByRole(ROLES.button, { name: PENDING_INVITE_TEXT.resendButtonName }));

    expect(await screen.findByText(LOBBY_MEMBER_LIST_TEXT.resendError)).toBeInTheDocument();
  });

  it('cancels a pending invite without leaving it stuck in a pending state', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_bondar');

    await user.click(screen.getByRole(ROLES.button, { name: PENDING_INVITE_TEXT.cancelButtonName }));

    await waitFor(() => {
      expect(
        screen.getByRole(ROLES.button, { name: PENDING_INVITE_TEXT.cancelButtonName }),
      ).toBeEnabled();
    });
  });

  it('opens a confirm dialog and PATCHes ownership when "Make owner" is confirmed', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }));
    expect(
      screen.getByText(
        'Make @nastia_k the owner of "Alex & Anastasiia"? You will become a regular member.',
      ),
    ).toBeInTheDocument();

    const [, confirmButton] = screen.getAllByRole(ROLES.button, {
      name: MEMBER_CARD_TEXT.makeOwnerButtonName,
    });
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(
        screen.queryByRole(ROLES.heading, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }),
      ).not.toBeInTheDocument();
    });
  });

  it('shows an inline error and keeps the dialog open when the make-owner PATCH fails', async () => {
    expect.assertions(1);
    server.use(http.patch(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }));
    const [, confirmButton] = screen.getAllByRole(ROLES.button, {
      name: MEMBER_CARD_TEXT.makeOwnerButtonName,
    });
    await user.click(confirmButton!);

    expect(await screen.findByText(LOBBY_MEMBER_LIST_TEXT.makeOwnerError)).toBeInTheDocument();
  });

  it('opens a confirm dialog and removes the member when "Remove" is confirmed', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<LobbyMemberList lobby={lobby} />);
    await screen.findByText('nastia_k');

    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }));
    const [, confirmButton] = screen.getAllByRole(ROLES.button, {
      name: MEMBER_CARD_TEXT.removeButtonName,
    });
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByRole(ROLES.heading, { name: 'Remove member' })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }));
    const [, confirmButton] = screen.getAllByRole(ROLES.button, {
      name: MEMBER_CARD_TEXT.removeButtonName,
    });
    await user.click(confirmButton!);

    expect(await screen.findByText(LOBBY_MEMBER_LIST_TEXT.removeError)).toBeInTheDocument();
  });
});
