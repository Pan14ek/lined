import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';
import type { EventConflictDto } from '@/features/calendar/model';
import { ConflictBanner } from '../ConflictBanner';

const YOGA = MOCK_EVENTS[3]!; // id 4, "Movie Night", ownerId 2
const MINE = MOCK_EVENTS[0]!; // id 1, "Morning Coffee", ownerId 1

const makeConflict = (overrides: Partial<EventConflictDto> = {}): EventConflictDto => {
  return {
    first: YOGA,
    second: MINE,
    overlapStart: YOGA.startAt,
    overlapEnd: YOGA.endAt,
    ...overrides,
  };
}

describe('ConflictBanner', () => {
  it('renders nothing when there are no conflicts', () => {
    expect.assertions(1);
    renderWithProviders(
      <ConflictBanner
        conflicts={[]}
        currentUserId={1}
        suggestion={null}
        onPickSuggestion={vi.fn()}
      />,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('names the other member and their conflicting event', async () => {
    expect.assertions(2);
    renderWithProviders(
      <ConflictBanner
        conflicts={[makeConflict()]}
        currentUserId={1}
        suggestion={null}
        onPickSuggestion={vi.fn()}
      />,
    );

    expect(await screen.findByText('nastia_k')).toBeInTheDocument();
    expect(screen.getByText(`“${YOGA.title}”`)).toBeInTheDocument();
  });

  it('shows a "Scheduling conflict" title naming the member count', async () => {
    expect.assertions(1);
    renderWithProviders(
      <ConflictBanner
        conflicts={[makeConflict()]}
        currentUserId={1}
        suggestion={null}
        onPickSuggestion={vi.fn()}
      />,
    );

    expect(await screen.findByText('Scheduling conflict for 1 member')).toBeInTheDocument();
  });

  it('shows the next-free-slot suggestion and calls onPickSuggestion when clicked', async () => {
    expect.assertions(2);
    const onPickSuggestion = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConflictBanner
        conflicts={[makeConflict()]}
        currentUserId={1}
        suggestion={{ start: '2026-04-11T20:00:00Z', end: '2026-04-11T21:00:00Z' }}
        onPickSuggestion={onPickSuggestion}
      />,
    );

    const hint = await screen.findByRole('button', { name: /next slot when everyone is free/i });
    expect(hint).toBeInTheDocument();

    await user.click(hint);
    expect(onPickSuggestion).toHaveBeenCalledWith(
      '2026-04-11T20:00:00Z',
      '2026-04-11T21:00:00Z',
    );
  });

  it('omits the suggestion hint when none is given', () => {
    expect.assertions(1);
    renderWithProviders(
      <ConflictBanner
        conflicts={[makeConflict()]}
        currentUserId={1}
        suggestion={null}
        onPickSuggestion={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /next slot/i })).not.toBeInTheDocument();
  });
});
