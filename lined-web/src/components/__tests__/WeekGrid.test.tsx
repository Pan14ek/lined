import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventDto, LobbyDto } from '@/types';
import { getWeekStart } from '@/lib/calendarUtils';
import { WeekGrid } from '../WeekGrid';

const LOBBY: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const WEEK_START = getWeekStart(new Date('2026-03-30T00:00:00')); // a Monday

const dayAt = (offsetDays: number, hour: number): Date => {
  const d = new Date(WEEK_START);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const makeEvent = (id: number, offsetDays: number, hour: number, durationHours = 1): EventDto => {
  const start = dayAt(offsetDays, hour);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return {
    id,
    title: `Event ${id}`,
    location: null,
    shared: true,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    timezone: 'UTC',
    lobbyId: LOBBY.id,
    ownerId: 1,
    createdAt: '2026-01-01T00:00:00Z',
  };
};

// 5 same-day events, so any overflow behavior (opt-in only) has something to bite on.
const fiveEventsOnMonday: EventDto[] = Array.from({ length: 5 }, (_, i) =>
  makeEvent(i + 1, 0, 9 + i),
);

describe('WeekGrid — regression guard (global calendar, no onDayClick)', () => {
  it('renders every event with no cap and no overflow pill', () => {
    expect.assertions(fiveEventsOnMonday.length + 1);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={fiveEventsOnMonday}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
      />,
    );

    for (const event of fiveEventsOnMonday) {
      expect(screen.getByText(event.title)).toBeInTheDocument();
    }
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it('renders the default 5-item legend', () => {
    expect.assertions(1);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Free slot')).toBeInTheDocument();
  });
});

describe('WeekGrid — legendItems override', () => {
  it('renders the supplied legend instead of the default', () => {
    expect.assertions(2);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        legendItems={[{ label: 'Shared event', color: '#000' }]}
      />,
    );

    expect(screen.getByText('Shared event')).toBeInTheDocument();
    expect(screen.queryByText('Couple')).not.toBeInTheDocument();
  });
});

describe('WeekGrid — getFreeSlotsForDay override', () => {
  it('uses the supplied free slots instead of computeFreeSlots', () => {
    expect.assertions(1);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        getFreeSlotsForDay={() => [{ startHour: 9, endHour: 10 }]}
      />,
    );

    expect(screen.getAllByText('Free slot').length).toBeGreaterThan(0);
  });
});

describe('WeekGrid — onFreeSlotClick opt-in', () => {
  it('renders free-slot bands as non-interactive divs when the prop is omitted', () => {
    expect.assertions(1);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        getFreeSlotsForDay={() => [{ startHour: 9, endHour: 10 }]}
      />,
    );

    expect(screen.queryByRole('button', { name: /reserve this free slot/i })).not.toBeInTheDocument();
  });

  it('calls onFreeSlotClick with the day and slot when a band is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onFreeSlotClick = vi.fn();
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        getFreeSlotsForDay={() => [{ startHour: 9, endHour: 10 }]}
        onFreeSlotClick={onFreeSlotClick}
      />,
    );

    const [band] = screen.getAllByRole('button', { name: /reserve this free slot/i });
    await user.click(band!);

    expect(onFreeSlotClick).toHaveBeenCalledTimes(1);
    expect(onFreeSlotClick).toHaveBeenCalledWith(expect.any(Date), { startHour: 9, endHour: 10 });
  });
});

describe('WeekGrid — onDayClick opt-in (lobby calendar behavior)', () => {
  it('caps visible events and shows a "+N more" pill', () => {
    expect.assertions(2);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={fiveEventsOnMonday}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
        maxVisibleEvents={4}
      />,
    );

    expect(screen.queryByText('Event 5')).not.toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('calls onDayClick with the full day event list when the pill is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={fiveEventsOnMonday}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onDayClick={onDayClick}
        maxVisibleEvents={4}
      />,
    );

    await user.click(screen.getByText('+1 more'));

    expect(onDayClick).toHaveBeenCalledTimes(1);
    const [, dayEvents] = onDayClick.mock.calls[0] as [Date, EventDto[]];
    expect(dayEvents).toHaveLength(5);
  });

  it('calls onDayClick when the day header is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={fiveEventsOnMonday}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onDayClick={onDayClick}
      />,
    );

    await user.click(screen.getByText('Mon 30'));

    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  it('renders overlapping events at fractional widths (lane assignment)', () => {
    expect.assertions(2);
    const overlapping = [makeEvent(10, 0, 9, 2), makeEvent(11, 0, 10, 1)];
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={overlapping}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onDayClick={vi.fn()}
      />,
    );

    const first = screen.getByText('Event 10').closest('button');
    const second = screen.getByText('Event 11').closest('button');
    expect(first?.style.width).toBe('calc(50% - 4px)');
    expect(second?.style.width).toBe('calc(50% - 4px)');
  });
});

describe('WeekGrid — hour labels', () => {
  it('shows the grid start hour and a closing "12 AM" label at the end', () => {
    expect.assertions(2);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
      />,
    );

    expect(screen.getByText('1 AM')).toBeInTheDocument();
    expect(screen.getByText('12 AM')).toBeInTheDocument();
  });
});

describe('WeekGrid — midnight-spanning events', () => {
  const midnightSpanning: EventDto = {
    id: 20,
    title: 'Movie Night',
    location: null,
    shared: true,
    startAt: dayAt(0, 23).toISOString(), // Monday 11 PM
    endAt: new Date(dayAt(1, 2).getTime()).toISOString(), // Tuesday 2 AM
    timezone: 'UTC',
    lobbyId: LOBBY.id,
    ownerId: 1,
    createdAt: '2026-01-01T00:00:00Z',
  };

  it('renders a clipped block on both the start day and the end day', () => {
    expect.assertions(1);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[midnightSpanning]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Movie Night')).toHaveLength(2);
  });

  it("clips the start-day segment's height to midnight, not the full duration", () => {
    expect.assertions(1);
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[midnightSpanning]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
      />,
    );

    const [mondayBlock] = screen.getAllByText('Movie Night').map((el) => el.closest('button'));
    // 11 PM -> midnight is 1h = 80px, well under the event's real 3h duration (240px).
    expect(mondayBlock?.style.height).toBe('80px');
  });

  it('does not double-count the event when the end day is clicked (onDayClick opt-in)', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(
      <WeekGrid
        weekStart={WEEK_START}
        events={[midnightSpanning]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onDayClick={onDayClick}
      />,
    );

    await user.click(screen.getByText('Tue 31'));

    const [, dayEvents] = onDayClick.mock.calls[0] as [Date, EventDto[]];
    expect(dayEvents).toHaveLength(1);
  });
});
