import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import type { EventDto } from '@/features/calendar/model';
import { useCreateMenuStore } from '@/store/createMenu';
import { LobbyCalendarView } from '../LobbyCalendarView';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, COUPLE

const todayStr = new Date().toISOString().slice(0, 10);

const makeEvent = (id: number, lobbyId: number, hour: number, title: string): EventDto => ({
  id,
  title,
  location: null,
  shared: true,
  visibility: 'SHARED',
  startAt: `${todayStr}T${String(hour).padStart(2, '0')}:00:00Z`,
  endAt: `${todayStr}T${String(hour + 1).padStart(2, '0')}:00:00Z`,
  timezone: 'UTC',
  lobbyId,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('LobbyCalendarView', () => {
  it('shows a loading state before events resolve', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    expect(screen.getByTestId('lobby-calendar-loading')).toBeInTheDocument();
  });

  it('shows an error message when the events request fails', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/calendar/events`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    expect(
      await screen.findByText("Couldn't load the calendar. Try again later."),
    ).toBeInTheDocument();
  });

  it('renders only this lobby\'s events, filtering out other lobbies\'', async () => {
    expect.assertions(2);
    server.use(
      http.get(`${BASE}/calendar/events`, () =>
        HttpResponse.json([
          makeEvent(1, LOBBY.id, 9, 'Morning Coffee'),
          makeEvent(2, 3, 10, 'Team Lunch'),
        ]),
      ),
    );
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
    expect(screen.queryByText('Team Lunch')).not.toBeInTheDocument();
  });

  it('renders a free-slot band inside the visible week', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/calendar/events`, () => HttpResponse.json([])),
      http.get(`${BASE}/lobbies/:id/free-slots`, () =>
        HttpResponse.json([{ start: `${todayStr}T14:00:00Z`, end: `${todayStr}T17:00:00Z` }]),
      ),
    );
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    await waitFor(() => {
      if (screen.queryAllByText('Free slot').length === 0) throw new Error('not yet rendered');
    });
    expect(screen.getAllByText('Free slot').length).toBeGreaterThan(0);
  });

  it('shows a "+N more" pill for a busy day and opens the day agenda listing all events', async () => {
    expect.assertions(2);
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent(i + 1, LOBBY.id, 9 + i, `Event ${i + 1}`),
    );
    server.use(http.get(`${BASE}/calendar/events`, () => HttpResponse.json(events)));
    const user = userEvent.setup();
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);
    await screen.findByText('Event 1');

    await user.click(screen.getByText('+1 more'));
    await screen.findAllByText(/Event \d/);

    expect(screen.queryByText('No events today.')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Event \d/).length).toBeGreaterThanOrEqual(5);
  });

  it('opens the event detail panel from the day agenda and closes the agenda', async () => {
    expect.assertions(1);
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent(i + 1, LOBBY.id, 9 + i, `Event ${i + 1}`),
    );
    server.use(http.get(`${BASE}/calendar/events`, () => HttpResponse.json(events)));
    const user = userEvent.setup();
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);
    await screen.findByText('Event 1');
    await user.click(screen.getByText('+1 more'));
    await screen.findAllByText(/Event \d/);

    const [agendaEventRow] = screen.getAllByText('Event 5');
    await user.click(agendaEventRow!);

    expect(await screen.findByRole('button', { name: 'Edit event' })).toBeInTheDocument();
  });

  it('"+ New event" opens CreateEventModal with the lobby locked', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/calendar/events`, () => HttpResponse.json([])));
    const user = userEvent.setup();
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    await user.click(screen.getByRole('button', { name: /new event/i }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(LOBBY.name)).toBeInTheDocument();
  });

  it('clicking an event opens the detail panel and delete closes it', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/calendar/events`, () =>
        HttpResponse.json([makeEvent(1, LOBBY.id, 9, 'Morning Coffee')]),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);
    await user.click(await screen.findByText('Morning Coffee'));
    await screen.findByRole('button', { name: 'Edit event' });

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      if (screen.queryByRole('button', { name: 'Edit event' })) throw new Error('still open');
    });
    expect(screen.queryByRole('button', { name: 'Edit event' })).not.toBeInTheDocument();
  });

  it('shows an inline error and keeps the panel open when the delete request fails', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/calendar/events`, () =>
        HttpResponse.json([makeEvent(1, LOBBY.id, 9, 'Morning Coffee')]),
      ),
      http.delete(`${BASE}/calendar/events/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);
    await user.click(await screen.findByText('Morning Coffee'));

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText('Could not delete this event — please try again'),
    ).toBeInTheDocument();
  });

  it('shows an empty state with an invite link when the lobby has no events this week', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/calendar/events`, () => HttpResponse.json([])));
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    expect(await screen.findByText('No events yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Invite someone' })).toHaveAttribute(
      'href',
      `/lobbies/${LOBBY.id}?tab=members`,
    );
  });

  it('does not show the empty state when the lobby has events this week', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/calendar/events`, () =>
        HttpResponse.json([makeEvent(1, LOBBY.id, 9, 'Morning Coffee')]),
      ),
    );
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);
    await screen.findByText('Morning Coffee');

    expect(screen.queryByText('No events yet.')).not.toBeInTheDocument();
  });

  it('clicking a free-slot band opens the reserve-slot overlay locked to this lobby', async () => {
    expect.assertions(2);
    const today = new Date();
    today.setUTCHours(14, 0, 0, 0);
    const start = today.toISOString();
    today.setUTCHours(17);
    const end = today.toISOString();
    server.use(
      http.get(`${BASE}/calendar/events`, () => HttpResponse.json([])),
      http.get(`${BASE}/lobbies/:id/free-slots`, () => HttpResponse.json([{ start, end }])),
    );
    const user = userEvent.setup();
    renderWithProviders(<LobbyCalendarView lobby={LOBBY} />);

    const [band] = await screen.findAllByRole('button', { name: /reserve this free slot/i });
    await user.click(band!);

    expect(useCreateMenuStore.getState().overlay).toBe('reserveSlot');
    expect(useCreateMenuStore.getState().reserveSlotInitial?.lobbyId).toBe(LOBBY.id);
  });
});
