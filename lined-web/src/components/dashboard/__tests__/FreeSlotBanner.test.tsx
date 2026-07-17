import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreeSlotBanner } from '../FreeSlotBanner';

describe('FreeSlotBanner', () => {
  it('renders nothing while loading', () => {
    expect.assertions(1);
    const { container } = render(<FreeSlotBanner slot={null} isLoading={true} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no qualifying slot was found', () => {
    expect.assertions(1);
    const { container } = render(<FreeSlotBanner slot={null} isLoading={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the free time message with the other member’s name when a slot exists', () => {
    expect.assertions(2);
    render(
      <FreeSlotBanner
        slot={{
          lobbyId: 1,
          start: '2026-03-29T14:00:00Z',
          end: '2026-03-29T17:00:00Z',
          lobbyName: 'Alex & Anastasiia',
          otherUsername: 'nastia_k',
        }}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Free time found!')).toBeInTheDocument();
    expect(screen.getByText(/nastia_k are both free/i)).toBeInTheDocument();
  });

  it('falls back to the lobby name when the other member is unknown', () => {
    expect.assertions(1);
    render(
      <FreeSlotBanner
        slot={{
          lobbyId: 1,
          start: '2026-03-29T14:00:00Z',
          end: '2026-03-29T17:00:00Z',
          lobbyName: 'Alex & Anastasiia',
          otherUsername: null,
        }}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/Alex & Anastasiia are both free/i)).toBeInTheDocument();
  });

  it('calls onPlan with the slot when "Plan something" is clicked', async () => {
    expect.assertions(1);
    const onPlan = vi.fn();
    const slot = {
      lobbyId: 1,
      start: '2026-03-29T14:00:00Z',
      end: '2026-03-29T17:00:00Z',
      lobbyName: 'Alex & Anastasiia',
      otherUsername: 'nastia_k',
    };
    render(<FreeSlotBanner slot={slot} isLoading={false} onPlan={onPlan} />);

    await userEvent.click(screen.getByRole('button', { name: /plan something/i }));

    expect(onPlan).toHaveBeenCalledWith(slot);
  });
});
