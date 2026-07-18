import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { MonthGrid } from '../MonthGrid';

const LOBBY: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const MONTH_ANCHOR = new Date('2026-03-15T00:00:00');

const makeEvent = (id: number, isoDate: string, title = `Event ${id}`): EventDto => ({
  id,
  title,
  location: null,
  shared: true,
  startAt: `${isoDate}T10:00:00`,
  endAt: `${isoDate}T11:00:00`,
  timezone: 'UTC',
  lobbyId: LOBBY.id,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('MonthGrid', () => {
  it('renders an event chip on the correct day', () => {
    expect.assertions(1);
    render(
      <MonthGrid
        monthAnchor={MONTH_ANCHOR}
        events={[makeEvent(1, '2026-03-10', 'Design Review')]}
        lobbies={[LOBBY]}
        onDayClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Design Review')).toBeInTheDocument();
  });

  it('dims cells outside the anchor month', () => {
    expect.assertions(1);
    render(
      <MonthGrid monthAnchor={MONTH_ANCHOR} events={[]} lobbies={[LOBBY]} onDayClick={vi.fn()} />,
    );

    // Feb 23 2026 is the leading other-month cell for March's grid (first "23" in the grid).
    const otherMonthCell = screen.getAllByText('23')[0]!.closest('button');
    expect(otherMonthCell?.className).toContain('bg-gray-50');
  });

  it('caps visible chips at 3 and shows a "+N more" label for the rest', () => {
    expect.assertions(2);
    const events = Array.from({ length: 5 }, (_, i) => makeEvent(i + 1, '2026-03-10'));
    render(
      <MonthGrid monthAnchor={MONTH_ANCHOR} events={events} lobbies={[LOBBY]} onDayClick={vi.fn()} />,
    );

    expect(screen.queryByText('Event 4')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('calls onDayClick with the clicked date', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(
      <MonthGrid monthAnchor={MONTH_ANCHOR} events={[]} lobbies={[LOBBY]} onDayClick={onDayClick} />,
    );

    await user.click(screen.getByText('10'));

    expect(onDayClick).toHaveBeenCalledWith(expect.any(Date));
  });

  it('renders the shared calendar legend', () => {
    expect.assertions(1);
    render(
      <MonthGrid monthAnchor={MONTH_ANCHOR} events={[]} lobbies={[LOBBY]} onDayClick={vi.fn()} />,
    );

    expect(screen.getByText('Free slot')).toBeInTheDocument();
  });
});
