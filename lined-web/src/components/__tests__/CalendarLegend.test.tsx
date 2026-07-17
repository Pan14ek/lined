import { describe, it, expect } from 'vitest';
import { screen, render } from '@testing-library/react';
import { CalendarLegend } from '../CalendarLegend';

describe('CalendarLegend', () => {
  it('renders the default 5-item legend when no items are supplied', () => {
    expect.assertions(5);
    render(<CalendarLegend />);

    for (const label of ['Couple', 'Family', 'Friends', 'Work', 'Free slot']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders a supplied items list instead of the default', () => {
    expect.assertions(2);
    render(<CalendarLegend items={[{ label: 'Shared event', color: '#000' }]} />);

    expect(screen.getByText('Shared event')).toBeInTheDocument();
    expect(screen.queryByText('Couple')).not.toBeInTheDocument();
  });
});
