import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { Skeleton } from '..';

describe('Skeleton', () => {
  it('renders a pulsing placeholder block', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<Skeleton data-testid="skeleton" className="h-4 w-24" />);

    expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass('animate-pulse');
  });

  it('forwards arbitrary size classes', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<Skeleton className="h-10 w-10 rounded-full" />);

    expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass('rounded-full');
  });
});
