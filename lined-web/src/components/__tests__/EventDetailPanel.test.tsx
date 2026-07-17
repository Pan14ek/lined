import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventDto, LobbyDto } from '@/types';
import { EventDetailPanel } from '../EventDetailPanel';

const LOBBY: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const BASE_EVENT: EventDto = {
  id: 1,
  title: 'Grocery Run',
  location: null,
  shared: true,
  startAt: '2026-03-28T17:00:00Z',
  endAt: '2026-03-28T18:00:00Z',
  timezone: 'UTC',
  lobbyId: 1,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('EventDetailPanel', () => {
  it('shows the location row when the event has a location', () => {
    expect.assertions(1);
    render(
      <EventDetailPanel
        event={{ ...BASE_EVENT, location: 'Whole Foods Market' }}
        lobby={LOBBY}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Whole Foods Market')).toBeInTheDocument();
  });

  it('omits the location row when the event has no location', () => {
    expect.assertions(1);
    render(
      <EventDetailPanel
        event={{ ...BASE_EVENT, location: null }}
        lobby={LOBBY}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText('Whole Foods Market')).not.toBeInTheDocument();
  });

  it('calls onEdit when "Edit event" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <EventDetailPanel event={BASE_EVENT} lobby={LOBBY} onClose={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit event' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when "Delete" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <EventDetailPanel event={BASE_EVENT} lobby={LOBBY} onClose={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <EventDetailPanel event={BASE_EVENT} lobby={LOBBY} onClose={onClose} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
