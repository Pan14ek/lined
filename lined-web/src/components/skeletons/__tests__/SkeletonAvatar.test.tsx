import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { SkeletonAvatar } from '../SkeletonAvatar';

describe('SkeletonAvatar', () => {
  it('renders a circular avatar block plus two text-line blocks', () => {
    expect.assertions(2);
    const { container } = renderWithProviders(<SkeletonAvatar testId="avatar-skel" />);

    const el = container.querySelector('[data-testid="avatar-skel"]');
    expect(el).toBeInTheDocument();
    expect(el?.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('applies a custom className to the wrapping row', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(
      <SkeletonAvatar className="px-5" testId="avatar-skel" />,
    );

    expect(container.querySelector('[data-testid="avatar-skel"]')).toHaveClass('px-5');
  });
});
