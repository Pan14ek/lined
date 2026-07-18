import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayChipStrip } from '../DayChipStrip';

describe('DayChipStrip', () => {
  it('renders a chip for each of the 7 days in the selected day\'s week', () => {
    expect.assertions(1);
    render(<DayChipStrip selectedDay={new Date('2026-03-25')} onSelectDay={() => {}} />);

    expect(screen.getAllByRole('tab')).toHaveLength(7);
  });

  it('marks the selected day as the active tab', () => {
    expect.assertions(1);
    const selectedDay = new Date('2026-03-25');
    render(<DayChipStrip selectedDay={selectedDay} onSelectDay={() => {}} />);

    const active = screen.getAllByRole('tab').filter((tab) => tab.getAttribute('aria-selected') === 'true');
    expect(active).toHaveLength(1);
  });

  it('calls onSelectDay with the clicked day', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onSelectDay = vi.fn();
    render(<DayChipStrip selectedDay={new Date('2026-03-25')} onSelectDay={onSelectDay} />);

    await user.click(screen.getAllByRole('tab')[2]!);

    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelectDay on mount', () => {
    expect.assertions(1);
    const onSelectDay = vi.fn();
    render(<DayChipStrip selectedDay={new Date('2026-03-25')} onSelectDay={onSelectDay} />);

    expect(onSelectDay).not.toHaveBeenCalled();
  });
});
