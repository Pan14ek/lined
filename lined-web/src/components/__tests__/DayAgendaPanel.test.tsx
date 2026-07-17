import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventDto, LobbyDto } from '@/types';
import { DayAgendaPanel } from '../DayAgendaPanel';

const LOBBY: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const OTHER_LOBBY: LobbyDto = {
  id: 2,
  name: 'Weekend Crew',
  lobbyType: 'FRIENDS',
  ownerId: 1,
  memberIds: [1, 2],
};

const DAY = new Date('2026-03-28T00:00:00');

const makeEvent = (id: number, startHour: number, lobbyId = LOBBY.id): EventDto => ({
  id,
  title: `Event ${id}`,
  location: null,
  shared: true,
  startAt: `2026-03-28T${String(startHour).padStart(2, '0')}:00:00`,
  endAt: `2026-03-28T${String(startHour + 1).padStart(2, '0')}:00:00`,
  timezone: 'UTC',
  lobbyId,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('DayAgendaPanel', () => {
  it('shows an empty state when there are no events', () => {
    expect.assertions(1);
    render(
      <DayAgendaPanel
        day={DAY}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('No events today.')).toBeInTheDocument();
  });

  it('renders events sorted chronologically with time, title, and lobby name', () => {
    expect.assertions(2);
    const later = makeEvent(1, 16);
    const earlier = makeEvent(2, 9);
    render(
      <DayAgendaPanel
        day={DAY}
        events={[later, earlier]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const titles = screen.getAllByText(/Event \d/).map((el) => el.textContent);
    expect(titles).toEqual(['Event 2', 'Event 1']);
    expect(screen.getAllByText('Alex & Anastasiia').length).toBe(2);
  });

  it('labels each event with its own lobby when events span multiple lobbies', () => {
    expect.assertions(2);
    render(
      <DayAgendaPanel
        day={DAY}
        events={[makeEvent(1, 9, LOBBY.id), makeEvent(2, 11, OTHER_LOBBY.id)]}
        lobbies={[LOBBY, OTHER_LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
  });

  it('calls onEventClick with the clicked event id', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onEventClick = vi.fn();
    render(
      <DayAgendaPanel
        day={DAY}
        events={[makeEvent(1, 9)]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={onEventClick}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Event 1'));

    expect(onEventClick).toHaveBeenCalledWith(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DayAgendaPanel
        day={DAY}
        events={[]}
        lobbies={[LOBBY]}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
