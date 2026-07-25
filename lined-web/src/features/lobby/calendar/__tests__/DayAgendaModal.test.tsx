import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { DayAgendaModal } from '../DayAgendaModal';

const LOBBY: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const DAY = new Date('2026-03-28T00:00:00');

const makeEvent = (id: number, startHour: number, location: string | null = null): EventDto => ({
  id,
  title: `Event ${id}`,
  location,
  shared: true,
  visibility: 'SHARED',
  startAt: `2026-03-28T${String(startHour).padStart(2, '0')}:00:00`,
  endAt: `2026-03-28T${String(startHour + 1).padStart(2, '0')}:00:00`,
  timezone: 'UTC',
  lobbyId: 1,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('DayAgendaModal', () => {
  it('renders events sorted chronologically with time and title', () => {
    expect.assertions(2);
    const later = makeEvent(1, 16);
    const earlier = makeEvent(2, 9);
    render(
      <DayAgendaModal
        day={DAY}
        events={[later, earlier]}
        freeSlots={[]}
        lobby={LOBBY}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole('button', { name: /Event \d/ });
    expect(rows[0]).toHaveTextContent('Event 2');
    expect(rows[1]).toHaveTextContent('Event 1');
  });

  it('omits the location line for an event without a location', () => {
    expect.assertions(1);
    render(
      <DayAgendaModal
        day={DAY}
        events={[makeEvent(1, 9, null)]}
        freeSlots={[]}
        lobby={LOBBY}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('renders a location line when present', () => {
    expect.assertions(1);
    render(
      <DayAgendaModal
        day={DAY}
        events={[makeEvent(1, 9, 'Home')]}
        freeSlots={[]}
        lobby={LOBBY}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders free-slot rows via formatHourRange', () => {
    expect.assertions(1);
    render(
      <DayAgendaModal
        day={DAY}
        events={[]}
        freeSlots={[{ startHour: 14, endHour: 17 }]}
        lobby={LOBBY}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('2–5 PM')).toBeInTheDocument();
  });

  it('shows "No events today" for an empty day while still listing free slots', () => {
    expect.assertions(2);
    render(
      <DayAgendaModal
        day={DAY}
        events={[]}
        freeSlots={[{ startHour: 14, endHour: 17 }]}
        lobby={LOBBY}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('No events today.')).toBeInTheDocument();
    expect(screen.getByText('2–5 PM')).toBeInTheDocument();
  });

  it('calls onEventClick when an event row is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onEventClick = vi.fn();
    render(
      <DayAgendaModal
        day={DAY}
        events={[makeEvent(1, 9)]}
        freeSlots={[]}
        lobby={LOBBY}
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
      <DayAgendaModal
        day={DAY}
        events={[]}
        freeSlots={[]}
        lobby={LOBBY}
        selectedEventId={null}
        onEventClick={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
