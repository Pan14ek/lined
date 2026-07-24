import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { SkeletonCard } from '../SkeletonCard';

describe('SkeletonCard', () => {
  it('renders a card-shaped skeleton block with the shared shimmer', () => {
    expect.assertions(2);
    const { container } = renderWithProviders(<SkeletonCard testId="card-skel" />);

    const el = container.querySelector('[data-testid="card-skel"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('animate-pulse', 'h-24');
  });

  it('merges a custom className without dropping the default shape', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<SkeletonCard className="w-48" testId="card-skel" />);

    expect(container.querySelector('[data-testid="card-skel"]')).toHaveClass('w-48', 'h-24');
  });
});
