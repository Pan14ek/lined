import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { Separator } from '..';

describe('Separator', () => {
  it('renders a horizontal divider by default', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<Separator />);

    expect(container.querySelector('[data-slot="separator"]')).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('renders a vertical divider when requested', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<Separator orientation="vertical" />);

    expect(container.querySelector('[data-slot="separator"]')).toHaveAttribute('data-orientation', 'vertical');
  });
});
