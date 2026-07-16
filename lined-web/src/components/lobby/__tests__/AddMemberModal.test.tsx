import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/test/data';
import { AddMemberModal } from '../AddMemberModal';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // id 1, memberIds [1, 2]

describe('AddMemberModal', () => {
  it('renders the title, search input, and invite-link hint', () => {
    expect.assertions(3);
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    expect(screen.getByText('Add Member')).toBeInTheDocument();
    expect(screen.getByLabelText('Search user')).toBeInTheDocument();
    expect(screen.getByText(/You can also share an invite link/)).toBeInTheDocument();
  });

  it('prompts for at least 2 characters before searching', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Search user'), 'n');

    expect(
      await screen.findByText('Type at least 2 characters to search.'),
    ).toBeInTheDocument();
  });

  it('shows matching users once the debounced query resolves', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Search user'), 'nastia');

    expect(await screen.findByText('nastia_k', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('nastia_bondar')).toBeInTheDocument();
  });

  it('marks an existing member as already in the lobby with no Invite button', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Search user'), 'nastia_k');
    await screen.findByText('nastia_k', {}, { timeout: 2000 });

    expect(screen.getByText('@nastia_k · already in lobby')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no users match', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Search user'), 'nobody_here');

    expect(await screen.findByText('No users found.', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('shows a search-failed message on a 500', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/users/search`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Search user'), 'nastia');

    expect(await screen.findByText('Search failed — try again.', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('invites an invitable user (with no pending invite) and flips the row to "Invite sent"', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('Search user'), 'natascha_m');
    await screen.findByText('natascha_m', {}, { timeout: 2000 });

    await user.click(screen.getByRole('button', { name: 'Invite' }));

    expect(await screen.findByRole('button', { name: 'Invite sent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite sent' })).toBeDisabled();
  });

  it('shows a 409 conflict message inline when the invite already exists', async () => {
    expect.assertions(1);
    server.use(
      http.post(
        `${BASE}/lobbies/:lobbyId/invites`,
        () =>
          HttpResponse.json(
            { code: 'CONFLICT', message: 'A pending invite already exists for this user' },
            { status: 409 },
          ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('Search user'), 'nastia_bondar');
    await screen.findByText('nastia_bondar', {}, { timeout: 2000 });

    await user.click(screen.getByRole('button', { name: 'Invite' }));

    expect(
      await screen.findByText('Already a member or already invited'),
    ).toBeInTheDocument();
  });

  it('shows a generic error message when the invite request fails unexpectedly (500)', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/lobbies/:lobbyId/invites`, () => new HttpResponse(null, { status: 500 })),
    );
    const user = userEvent.setup();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('Search user'), 'nastia_bondar');
    await screen.findByText('nastia_bondar', {}, { timeout: 2000 });

    await user.click(screen.getByRole('button', { name: 'Invite' }));

    expect(await screen.findByText("Couldn't send invite — try again")).toBeInTheDocument();
  });

  it('calls onClose when Done is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close (X) button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AddMemberModal lobby={lobby} onClose={onClose} />);

    await user.click(screen.getByLabelText('Close'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
