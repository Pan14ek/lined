import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { CalendarPage } from '../CalendarPage';
import { useAuthStore } from '@/store/auth';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

/** "Morning Coffee"'s local calendar day — deriving it from the mock event
 *  (rather than assuming it equals `new Date()`) keeps these tests stable
 *  regardless of the machine's timezone/time-of-day relative to the mock
 *  data's UTC-sliced "today" fixture. */
const morningCoffeeLocalDay = (): Date => {
  const day = new Date(MOCK_EVENTS[0]!.startAt);
  day.setHours(0, 0, 0, 0);
  return day;
};

/** Forces useMediaQuery('(max-width: 767px)') to report a phone width. */
const mockPhoneViewport = () => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query === '(max-width: 767px)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
};

describe('CalendarPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
    useCalendarStore.setState({
      weekStart: useCalendarStore.getState().weekStart,
      monthAnchor: useCalendarStore.getState().monthAnchor,
      viewMode: 'week',
      selectedEventId: null,
      isCreateModalOpen: false,
      hiddenLobbyIds: [],
    });
  });

  it('opens the detail panel, edits an event, and shows the updated title', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(await screen.findByText('Morning Coffee'));
    await user.click(await screen.findByRole('button', { name: 'Edit event' }));
    const titleInput = await screen.findByDisplayValue('Morning Coffee');
    await user.clear(titleInput);
    await user.type(titleInput, 'Espresso Run');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(
      () => expect(screen.getAllByText('Espresso Run').length).toBeGreaterThan(0),
      { timeout: 3000 },
    );
  });

  it('switches to month view and renders a day-of-week header', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: 'Month' }));

    expect(await screen.findByText('Mon')).toBeInTheDocument();
  });

  it('switches back to week view when a month-grid day is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: 'Month' }));
    await screen.findByText('Mon');
    // Click the day cell containing today's date to drill into its week
    // (scoped to the day-number badge, not the topbar's active "Month" toggle).
    const todayCell = document.querySelector('.h-5.w-5.bg-brand-green')?.closest('button');
    expect(todayCell).not.toBeNull();
    if (todayCell) await user.click(todayCell);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Week' })).toHaveClass('bg-brand-green'),
    );
  });

  it('opens the reserve-slot overlay without a lobbyId when a free-slot band is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    const [band] = await screen.findAllByRole('button', { name: /reserve this free slot/i });
    await user.click(band!);

    expect(useCreateMenuStore.getState().overlay).toBe('reserveSlot');
    expect(useCreateMenuStore.getState().reserveSlotInitial?.lobbyId).toBeUndefined();
  });

  it('opens the day agenda panel listing that day\'s events when a day header is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee');

    const todayLabel = `${new Date().toLocaleDateString('en-US', { weekday: 'short' })} ${new Date().getDate()}`;
    await user.click(screen.getByRole('button', { name: todayLabel }));

    expect(await screen.findAllByText('Morning Coffee')).toHaveLength(2); // grid event + agenda row
  });

  it('selects the event and shows its detail panel when an agenda row is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee');

    const todayLabel = `${new Date().toLocaleDateString('en-US', { weekday: 'short' })} ${new Date().getDate()}`;
    await user.click(screen.getByRole('button', { name: todayLabel }));

    const [, agendaRow] = await screen.findAllByText('Morning Coffee');
    await user.click(agendaRow!);

    expect(await screen.findByRole('button', { name: 'Edit event' })).toBeInTheDocument();
  });

  it('hides a lobby\'s events from the grid when it is unchecked in the Filters dropdown', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee'); // lobby 1 (Alex & Anastasiia)

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Alex & Anastasiia/ }));

    await waitFor(() => expect(screen.queryByText('Morning Coffee')).not.toBeInTheDocument());
    expect(screen.getByText('Team Lunch')).toBeInTheDocument(); // a different lobby, still visible
  });

  it('shows an inline error and keeps the event when the delete request fails', async () => {
    expect.assertions(2);
    server.use(
      http.delete(`${BASE}/calendar/events/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    );
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(await screen.findByText('Morning Coffee'));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText('Could not delete this event — please try again'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Morning Coffee').length).toBeGreaterThan(0);
  });

  it('shows an empty-week state with a "Create event" action when there are no events', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/calendar/events`, () => HttpResponse.json([])));
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    expect(
      await screen.findByText('No events this week — create one.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(useCalendarStore.getState().isCreateModalOpen).toBe(true);
  });

  it('shows a grid-shaped skeleton while events are loading', () => {
    expect.assertions(1);
    renderWithProviders(<CalendarPage />);

    expect(screen.getByTestId('calendar-loading')).toBeInTheDocument();
  });

  it('falls back to the retry state after a 10s stall instead of shimmering forever', async () => {
    expect.assertions(2);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    server.use(
      http.get(`${BASE}/calendar/events`, async () => {
        await delay('infinite');
        return HttpResponse.json([]);
      }),
    );

    try {
      renderWithProviders(<CalendarPage />);

      expect(screen.getByTestId('calendar-loading')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not show the empty-week state when events exist', async () => {
    expect.assertions(1);
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee');

    expect(screen.queryByText('No events this week — create one.')).not.toBeInTheDocument();
  });

  it('reflects a hidden lobby as unchecked and re-shows its events once re-checked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    useCalendarStore.setState({ hiddenLobbyIds: [1] });
    renderWithProviders(<CalendarPage />);

    await waitFor(() => expect(screen.queryByText('Morning Coffee')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: /filters/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Alex & Anastasiia/ }));

    expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
  });

  describe('phone viewport', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('renders a single-day view with a day-chip strip instead of the week/month toggle', async () => {
      expect.assertions(3);
      mockPhoneViewport();
      useCalendarStore.setState({ dayAnchor: morningCoffeeLocalDay() });
      renderWithProviders(<CalendarPage />);

      expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Week' })).not.toBeInTheDocument();
      expect(screen.getByRole('tablist', { name: 'Select day' })).toBeInTheDocument();
    });

    it('shows a floating "+" button that opens the create-event modal', async () => {
      expect.assertions(1);
      mockPhoneViewport();
      useCalendarStore.setState({ dayAnchor: morningCoffeeLocalDay() });
      const user = userEvent.setup();
      renderWithProviders(<CalendarPage />);
      await screen.findByText('Morning Coffee');

      await user.click(screen.getByRole('button', { name: 'New event' }));

      expect(useCalendarStore.getState().isCreateModalOpen).toBe(true);
    });

    it('moves to the next day when the next-day chevron is clicked', async () => {
      expect.assertions(1);
      mockPhoneViewport();
      useCalendarStore.setState({ dayAnchor: morningCoffeeLocalDay() });
      const user = userEvent.setup();
      const initialDay = useCalendarStore.getState().dayAnchor;
      renderWithProviders(<CalendarPage />);
      await screen.findByText('Morning Coffee');

      await user.click(screen.getByRole('button', { name: 'Next day' }));

      expect(useCalendarStore.getState().dayAnchor.getTime()).toBeGreaterThan(initialDay.getTime());
    });
  });
});
