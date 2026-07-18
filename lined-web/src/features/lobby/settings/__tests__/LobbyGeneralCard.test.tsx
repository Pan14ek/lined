import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { LobbyGeneralCard } from '../LobbyGeneralCard';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // id 1, name "Alex & Anastasiia", type COUPLE

describe('LobbyGeneralCard', () => {
  it('pre-fills the lobby name and selects the current type', () => {
    expect.assertions(2);
    renderWithProviders(<LobbyGeneralCard lobby={lobby} isOwner />);

    expect(screen.getByLabelText('Lobby name')).toHaveValue(lobby.name);
    expect(screen.getByRole('radio', { name: /couple/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('keeps Save changes disabled until a field is edited', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LobbyGeneralCard lobby={lobby} isOwner />);

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await user.type(screen.getByLabelText('Lobby name'), 'x');

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('saves only the changed field', async () => {
    expect.assertions(1);
    let receivedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${BASE}/lobbies/:id`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...lobby, ...receivedBody });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyGeneralCard lobby={lobby} isOwner />);

    await user.click(screen.getByRole('radio', { name: /family/i }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(receivedBody).toEqual({ lobbyType: 'FAMILY' }));
  });

  it('shows a forbidden error message on 403', async () => {
    expect.assertions(1);
    server.use(
      http.patch(`${BASE}/lobbies/:id`, () =>
        HttpResponse.json({ code: 'FORBIDDEN', message: 'nope' }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyGeneralCard lobby={lobby} isOwner />);

    await user.type(screen.getByLabelText('Lobby name'), 'x');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the lobby owner can update lobby settings',
    );
  });

  it('shows a validation error message on 400', async () => {
    expect.assertions(1);
    server.use(
      http.patch(`${BASE}/lobbies/:id`, () =>
        HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'blank' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyGeneralCard lobby={lobby} isOwner />);

    await user.type(screen.getByLabelText('Lobby name'), 'x');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid lobby name');
  });

  it('renders a read-only card with no Save button for a non-owner viewer', () => {
    expect.assertions(3);
    renderWithProviders(<LobbyGeneralCard lobby={lobby} isOwner={false} />);

    expect(screen.getByLabelText('Lobby name')).toBeDisabled();
    expect(screen.getByRole('radio', { name: /couple/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });
});
