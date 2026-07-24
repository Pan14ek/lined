import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { CalendarSkeleton } from '../CalendarSkeleton';

describe('CalendarSkeleton', () => {
  it('renders a 7-day grid of placeholder blocks by default', () => {
    expect.assertions(2);
    const { container } = renderWithProviders(<CalendarSkeleton testId="calendar-loading" />);

    const el = container.querySelector('[data-testid="calendar-loading"]');
    expect(el).toBeInTheDocument();
    expect(el?.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders a single day column when dayCount is 1, for the phone day view', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(
      <CalendarSkeleton dayCount={1} testId="calendar-loading" />,
    );

    // 1 header block + 3 blocks per day column = 4 skeleton blocks total.
    expect(
      container.querySelector('[data-testid="calendar-loading"]')?.querySelectorAll('.animate-pulse'),
    ).toHaveLength(4);
  });
});
