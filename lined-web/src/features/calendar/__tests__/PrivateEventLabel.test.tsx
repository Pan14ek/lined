import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventDto } from '@/features/calendar/model';
import { PrivateEventLabel } from '../PrivateEventLabel';

const makeEvent = (overrides: Partial<EventDto> = {}): EventDto => ({
  id: 1,
  title: 'Pick up the gift',
  location: null,
  shared: true,
  visibility: 'SHARED',
  startAt: '2026-03-28T17:00:00Z',
  endAt: '2026-03-28T18:00:00Z',
  timezone: 'UTC',
  lobbyId: 1,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('PrivateEventLabel', () => {
  it('renders a lock icon with an accessible label for a private event', () => {
    expect.assertions(2);
    const { container } = render(
      <PrivateEventLabel event={makeEvent({ visibility: 'PRIVATE', shared: false })} />,
    );

    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders only the title, with no icon or private label, for a shared event', () => {
    expect.assertions(3);
    const { container } = render(<PrivateEventLabel event={makeEvent()} />);

    expect(screen.getByText('Pick up the gift')).toBeInTheDocument();
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
