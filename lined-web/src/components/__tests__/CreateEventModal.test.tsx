import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES, MOCK_EVENTS } from '@/test/data';
import { CreateEventModal } from '../CreateEventModal';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, COUPLE
const EVENT = MOCK_EVENTS[0]!; // id 1, lobbyId 1, location 'Blue Bottle Cafe'

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

describe('CreateEventModal — edit mode', () => {
  it('pre-fills the title and location from the event and shows "Edit Event"', () => {
    expect.assertions(2);
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue(EVENT.title)).toBeInTheDocument();
  });

  it('locks the lobby selector to the event\'s lobby', () => {
    expect.assertions(2);
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(LOBBY.name)).toBeInTheDocument();
  });

  it('submits a PATCH with the edited title and calls onSaved', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={onSaved} />,
    );

    const titleInput = screen.getByDisplayValue(EVENT.title);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Coffee Run');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Coffee Run' }),
      ),
    );
  });

  it('surfaces an inline error on a 400 response in edit mode', async () => {
    expect.assertions(1);
    server.use(
      http.patch(`${BASE}/calendar/events/:id`, () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'title must not be blank' },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a valid title and time range',
    );
  });

  it('surfaces a generic error on a 500 response in edit mode', async () => {
    expect.assertions(1);
    server.use(
      http.patch(`${BASE}/calendar/events/:id`, () => new HttpResponse(null, { status: 500 })),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save changes — please try again",
    );
  });
});
