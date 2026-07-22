import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { ROLES, ADD_MEMBER_MODAL_TEXT } from '@/test/lobbyMemberContent';
import { AddMemberModal } from '../AddMemberModal';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // id 1, memberIds [1, 2]
const SEARCH_TIMEOUT = { timeout: 2000 };

describe('AddMemberModal', () => {
  it('renders the title, search input, and invite-link hint', () => {
    expect.assertions(3);
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    expect(screen.getByText(ADD_MEMBER_MODAL_TEXT.title)).toBeInTheDocument();
    expect(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel)).toBeInTheDocument();
    expect(screen.getByText(ADD_MEMBER_MODAL_TEXT.inviteLinkHint)).toBeInTheDocument();
  });

  it('prompts for at least 2 characters before searching', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'n');

    expect(await screen.findByText(ADD_MEMBER_MODAL_TEXT.minCharsHint)).toBeInTheDocument();
  });

  it('shows matching users once the debounced query resolves', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'nastia');

    expect(await screen.findByText('nastia_k', {}, SEARCH_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByText('nastia_bondar')).toBeInTheDocument();
  });

  it('marks an existing member as already in the lobby with no Invite button', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'nastia_k');
    await screen.findByText('nastia_k', {}, SEARCH_TIMEOUT);

    expect(
      screen.getByText(`@nastia_k · ${ADD_MEMBER_MODAL_TEXT.alreadyMemberSuffix}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.inviteButtonName }),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state when no users match', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'nobody_here');

    expect(
      await screen.findByText(ADD_MEMBER_MODAL_TEXT.noUsersFound, {}, SEARCH_TIMEOUT),
    ).toBeInTheDocument();
  });

  it('shows a search-failed message on a 500', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/users/search`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'nastia');

    expect(
      await screen.findByText(ADD_MEMBER_MODAL_TEXT.searchFailed, {}, SEARCH_TIMEOUT),
    ).toBeInTheDocument();
  });

  it('invites an invitable user (with no pending invite) and flips the row to "Invite sent"', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'natascha_m');
    await screen.findByText('natascha_m', {}, SEARCH_TIMEOUT);

    await user.click(screen.getByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.inviteButtonName }));

    expect(
      await screen.findByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.inviteSentButtonName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.inviteSentButtonName }),
    ).toBeDisabled();
  });

  it('shows a 409 conflict message inline when the invite already exists', async () => {
    expect.assertions(1);
    server.use(
      http.post(
        `${BASE}/lobbies/:lobbyId/invites`,
        () =>
          HttpResponse.json(
            { code: 'CONFLICT', message: 'A pending invite already exists for this user' },
            { status: HTTP_STATUS.CONFLICT },
          ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'nastia_bondar');
    await screen.findByText('nastia_bondar', {}, SEARCH_TIMEOUT);

    await user.click(screen.getByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.inviteButtonName }));

    expect(await screen.findByText(ADD_MEMBER_MODAL_TEXT.conflictError)).toBeInTheDocument();
  });

  it('shows a generic error message when the invite request fails unexpectedly (500)', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/lobbies/:lobbyId/invites`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    );
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.searchLabel), 'nastia_bondar');
    await screen.findByText('nastia_bondar', {}, SEARCH_TIMEOUT);

    await user.click(screen.getByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.inviteButtonName }));

    expect(await screen.findByText(ADD_MEMBER_MODAL_TEXT.genericInviteError)).toBeInTheDocument();
  });

  it('calls onClose when Done is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={onClose} />);

    await user.click(screen.getByRole(ROLES.button, { name: ADD_MEMBER_MODAL_TEXT.doneButtonName }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close (X) button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={onClose} />);

    await user.click(screen.getByLabelText(ADD_MEMBER_MODAL_TEXT.closeButtonName));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
