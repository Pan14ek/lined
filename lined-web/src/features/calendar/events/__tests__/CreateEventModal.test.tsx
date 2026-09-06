import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import type { EventConflictDto } from '@/features/calendar/model';
import { useAuthStore } from '@/store/auth';
import { CreateEventModal } from '../CreateEventModal';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, COUPLE, members [1, 2]
const EVENT = MOCK_EVENTS[0]!; // id 1, lobbyId 1, location 'Blue Bottle Cafe'
const YOGA = MOCK_EVENTS[3]!; // id 4, lobbyId 1, ownerId 2, "Movie Night"

const mockConflict = (overrides: Partial<EventConflictDto> = {}): EventConflictDto => {
  return { first: YOGA, second: EVENT, overlapStart: YOGA.startAt, overlapEnd: YOGA.endAt, ...overrides };
}

describe('CreateEventModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
  });

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
          { status: HTTP_STATUS.BAD_REQUEST },
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
    server.use(http.post(`${BASE}/calendar/events`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
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
          { status: HTTP_STATUS.BAD_REQUEST },
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
      http.patch(`${BASE}/calendar/events/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
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

describe('CreateEventModal — visibility', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
  });

  it('defaults to Shared and Notify members enabled in create mode', async () => {
    expect.assertions(1);
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByPlaceholderText(/movie night/i), 'Board game night');
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: 'SHARED', notifyMembers: true }),
      ),
    );
  });

  it('selecting Private disables and clears Notify members before submit', async () => {
    expect.assertions(2);
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByPlaceholderText(/movie night/i), 'Board game night');
    await user.click(screen.getByRole('button', { name: 'Private' }));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: 'PRIVATE', notifyMembers: false }),
      ),
    );
  });

  it('does not render the visibility control when editing another member\'s event', () => {
    expect.assertions(1);
    useAuthStore.setState({ accessToken: 'mock-token-2', status: 'authenticated' }); // EVENT is owned by user 1
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.queryByText('Visibility')).not.toBeInTheDocument();
  });

  it('renders the visibility control for the event owner in edit mode', async () => {
    expect.assertions(1);
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(await screen.findByText('Visibility')).toBeInTheDocument();
  });

  it('shows the shared-to-private warning only on that transition', async () => {
    expect.assertions(3);
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.queryByText(/removes it from other members' views/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Private' }));
    expect(screen.getByText(/removes it from other members' views/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Shared with lobby' }));
    expect(screen.queryByText(/removes it from other members' views/)).not.toBeInTheDocument();
  });

  it('does not show the shared-to-private warning in create mode', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Private' }));

    expect(screen.queryByText(/removes it from other members' views/)).not.toBeInTheDocument();
  });
});

describe('CreateEventModal — conflict warnings', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
  });

  it('shows a conflict banner naming the busy member and swaps the button to "Create Anyway"', async () => {
    expect.assertions(3);
    server.use(http.get(`${BASE}/calendar/conflicts`, () => HttpResponse.json([mockConflict()])));
    renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('nastia_k');
    expect(screen.getByRole('status')).toHaveTextContent(YOGA.title);
    expect(await screen.findByRole('button', { name: 'Create Anyway' })).toBeInTheDocument();
  });

  it('shows no banner when the conflicts endpoint returns none', async () => {
    expect.assertions(2);
    renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Create Event' })).toBeInTheDocument();
  });

  it('does not block submission or show a banner when the conflicts check fails (fail open)', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/calendar/conflicts`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByPlaceholderText(/movie night/i), 'Board game night');
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it('filters out a conflict against the event currently being edited', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/calendar/conflicts`, () =>
        HttpResponse.json([mockConflict({ second: EVENT })]),
      ),
    );
    renderWithProviders(
      <CreateEventModal lobbies={MOCK_LOBBIES} event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('clicking the suggestion rewrites the start/end fields (same duration)', async () => {
    expect.assertions(2);
    const suggestedStart = '2026-04-11T20:00:00Z';
    server.use(
      http.get(`${BASE}/calendar/conflicts`, () => HttpResponse.json([mockConflict()])),
      http.get(`${BASE}/lobbies/:id/free-slots`, () =>
        HttpResponse.json([{ start: suggestedStart, end: '2026-04-11T23:00:00Z' }]),
      ),
    );
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <CreateEventModal lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={vi.fn()} />,
    );
    const getTimeInputs = () =>
      Array.from(container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]'));
    // Default new-event duration is 1h, so the suggestion should preserve that,
    // not the full 3h free window returned above.
    const [originalStart, originalEnd] = getTimeInputs();
    const expectedDurationMs =
      new Date(originalEnd!.value).getTime() - new Date(originalStart!.value).getTime();

    const hint = await screen.findByRole('button', { name: /next slot when everyone is free/i });
    await user.click(hint);

    const [newStart, newEnd] = getTimeInputs();
    expect(new Date(newStart!.value).toISOString()).toBe(new Date(suggestedStart).toISOString());
    expect(new Date(newEnd!.value).getTime() - new Date(newStart!.value).getTime()).toBe(
      expectedDurationMs,
    );
  });
});
