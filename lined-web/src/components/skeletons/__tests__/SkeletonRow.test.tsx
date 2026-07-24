import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { SkeletonRow } from '../SkeletonRow';

describe('SkeletonRow', () => {
  it('renders a row-shaped skeleton block with the shared shimmer', () => {
    expect.assertions(2);
    const { container } = renderWithProviders(<SkeletonRow testId="row-skel" />);

    const el = container.querySelector('[data-testid="row-skel"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('animate-pulse', 'h-14');
  });

  it('uses a bone color visible against a white light-theme surface, not just shadcn\'s low-contrast bg-muted', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<SkeletonRow testId="row-skel" />);

    expect(container.querySelector('[data-testid="row-skel"]')).toHaveClass(
      'bg-gray-200',
      'dark:bg-gray-700',
    );
  });

  it('merges a custom className without dropping the default shape', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<SkeletonRow className="w-1/2" testId="row-skel" />);

    expect(container.querySelector('[data-testid="row-skel"]')).toHaveClass('w-1/2', 'h-14');
  });
});
