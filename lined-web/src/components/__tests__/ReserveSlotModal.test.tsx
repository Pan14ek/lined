import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES, MOCK_FREE_SLOT } from '@/test/data';
import { useAuthStore } from '@/store/auth';
import { ReserveSlotModal } from '../ReserveSlotModal';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, members [1, 2]
const OTHER_LOBBY = MOCK_LOBBIES[1]!; // id 2, members [1, 2]

beforeEach(() => {
  useAuthStore.setState({ userId: 1, token: 'token' });
});

describe('ReserveSlotModal — mode A (full slot, lobby known)', () => {
  it('pre-fills the title-less form from the given slot and shows the lobby, read-only', async () => {
    expect.assertions(3);
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ lobbyId: LOBBY.id, start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(`${LOBBY.name} are both free`)).toBeInTheDocument();
    expect(screen.queryByLabelText('Lobby')).not.toBeInTheDocument();
    expect(screen.getByLabelText('What would you like to do?')).toHaveValue('');
  });

  it('lists lobby members in the attendee row, tagging the current user', async () => {
    expect.assertions(2);
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ lobbyId: LOBBY.id, start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('alex_johnson')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
  });

  it('does not submit when the title is blank', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onReserved = vi.fn();
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ lobbyId: LOBBY.id, start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
        onReserved={onReserved}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /reserve slot/i }));

    expect(onReserved).not.toHaveBeenCalled();
  });

  it('submits a shared event with the lobby, title, and pre-filled times, calling onReserved', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onReserved = vi.fn();
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ lobbyId: LOBBY.id, start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
        onReserved={onReserved}
      />,
    );

    await user.type(
      await screen.findByLabelText('What would you like to do?'),
      'Walk in the park',
    );
    await user.click(screen.getByRole('button', { name: /reserve slot/i }));

    await waitFor(() => expect(onReserved).toHaveBeenCalledTimes(1));
  });

  it('shows an inline error when the API rejects the request', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/calendar/events`, () =>
        HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'title must not be blank' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ lobbyId: LOBBY.id, start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
      />,
    );

    await user.type(await screen.findByLabelText('What would you like to do?'), 'Movie night');
    await user.click(screen.getByRole('button', { name: /reserve slot/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid title and time range/i);
  });
});

describe('ReserveSlotModal — mode B (time only, no lobby)', () => {
  it('shows an editable lobby select pre-filled with the clicked time', async () => {
    expect.assertions(2);
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
      />,
    );

    const select = await screen.findByLabelText('Lobby');
    expect(select).toBeInTheDocument();
    expect(select).toBeEnabled();
  });

  it('submits with the lobby chosen from the select', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onReserved = vi.fn();
    renderWithProviders(
      <ReserveSlotModal
        lobbies={MOCK_LOBBIES}
        initial={{ start: MOCK_FREE_SLOT.start, end: MOCK_FREE_SLOT.end }}
        onClose={vi.fn()}
        onReserved={onReserved}
      />,
    );

    await user.selectOptions(await screen.findByLabelText('Lobby'), String(OTHER_LOBBY.id));
    await user.type(screen.getByLabelText('What would you like to do?'), 'Family game night');
    await user.click(screen.getByRole('button', { name: /reserve slot/i }));

    await waitFor(() => expect(onReserved).toHaveBeenCalledTimes(1));
  });
});

describe('ReserveSlotModal — mode C (no slot, candidate picker)', () => {
  it('shows an empty state when no lobby has a qualifying free slot', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobbies/:id/free-slots`, () => HttpResponse.json([])));
    renderWithProviders(<ReserveSlotModal lobbies={MOCK_LOBBIES} initial={null} onClose={vi.fn()} />);

    expect(
      await screen.findByText(/no shared free time found in the next 7 days/i),
    ).toBeInTheDocument();
  });

  it('calls onClose from the empty state', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobbies/:id/free-slots`, () => HttpResponse.json([])));
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<ReserveSlotModal lobbies={MOCK_LOBBIES} initial={null} onClose={onClose} />);

    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists one candidate per multi-member lobby that has a qualifying slot', async () => {
    expect.assertions(3);
    renderWithProviders(<ReserveSlotModal lobbies={MOCK_LOBBIES} initial={null} onClose={vi.fn()} />);

    expect(await screen.findByText('Choose a time')).toBeInTheDocument();
    expect(screen.getByText(LOBBY.name)).toBeInTheDocument();
    expect(screen.getByText(OTHER_LOBBY.name)).toBeInTheDocument();
  });

  it('picking a candidate opens the pre-filled form for that lobby', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<ReserveSlotModal lobbies={MOCK_LOBBIES} initial={null} onClose={vi.fn()} />);

    await screen.findByText('Choose a time');
    await user.click(screen.getByText(LOBBY.name));

    expect(await screen.findByText(`${LOBBY.name} are both free`)).toBeInTheDocument();
  });
});
