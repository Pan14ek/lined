import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/test/data';
import { CreateEventModal } from '../CreateEventModal';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, COUPLE

describe('CreateEventModal', () => {
  it('shows an editable lobby select when not locked', () => {
    expect.assertions(2);
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toBeEnabled();
  });

  it('shows a static lobby name and no select when locked', () => {
    expect.assertions(2);
    renderWithProviders(
      <CreateEventModal
        lobbies={[LOBBY]}
        lockedLobbyId={LOBBY.id}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(LOBBY.name)).toBeInTheDocument();
  });

  it('does not submit when the title is blank', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(onCreated).not.toHaveBeenCalled();
  });

  it('submits with the locked lobby id and calls onCreated on success', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <CreateEventModal
        lobbies={[LOBBY]}
        lockedLobbyId={LOBBY.id}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    );

    await user.type(screen.getByPlaceholderText(/movie night/i), 'Board game night');
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ lobbyId: LOBBY.id }),
      ),
    );
  });

  it('surfaces an inline error on a 400 response', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/calendar/events`, () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'title must not be blank' },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(/movie night/i), 'Board game night');
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a valid title and time range',
    );
  });

  it('surfaces a generic error on a 500 response', async () => {
    expect.assertions(1);
    server.use(http.post(`${BASE}/calendar/events`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(/movie night/i), 'Board game night');
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't create event — please try again",
    );
  });
});
