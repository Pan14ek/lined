import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { EventDto } from '@/features/calendar/model';
import { AgendaEventRow } from '../AgendaEventRow';

const event: EventDto = {
  id: 11,
  title: 'Dinner reservation',
  location: 'Bistro',
  shared: true,
  startAt: '2026-07-20T18:00:00Z',
  endAt: '2026-07-20T19:00:00Z',
  timezone: 'UTC',
  lobbyId: 4,
  ownerId: 1,
  createdAt: '2026-07-19T10:00:00Z',
};

describe('AgendaEventRow', () => {
  it('renders event details and invokes the owner callback', async () => {
    expect.assertions(3);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <AgendaEventRow
        event={event}
        accentColor="var(--color-lobby-couple)"
        isSelected={false}
        secondaryContent={<div>Bistro</div>}
        onClick={onClick}
      />,
    );

    expect(screen.getByText('Dinner reservation')).toBeInTheDocument();
    expect(screen.getByText('Bistro')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dinner reservation/i }));
    expect(onClick).toHaveBeenCalledWith(11);
  });

  it('applies the selected border state', () => {
    expect.assertions(1);
    renderWithProviders(
      <AgendaEventRow
        event={event}
        accentColor="var(--color-lobby-couple)"
        isSelected
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /dinner reservation/i })).toHaveClass('border-brand-green');
  });
});
