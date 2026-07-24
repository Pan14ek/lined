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

  it('defaults every inner block to a bone color visible against a white light-theme surface', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<SkeletonAvatar testId="avatar-skel" />);

    const bones = container.querySelectorAll('[data-testid="avatar-skel"] .animate-pulse');
    expect(
      [...bones].every((bone) => bone.classList.contains('bg-gray-200')),
    ).toBe(true);
  });

  it('applies a custom bone color to every inner block, e.g. for a dark background', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(
      <SkeletonAvatar boneClassName="bg-brand-sidebar-hover" testId="avatar-skel" />,
    );

    const bones = container.querySelectorAll('[data-testid="avatar-skel"] .animate-pulse');
    expect([...bones].every((bone) => bone.classList.contains('bg-brand-sidebar-hover'))).toBe(
      true,
    );
  });
});
