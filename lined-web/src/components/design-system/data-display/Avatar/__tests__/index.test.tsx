import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { Avatar } from '..';

describe('Avatar', () => {
  it('renders the fallback text when there is no image', () => {
    expect.assertions(1);
    renderWithProviders(<Avatar fallback="A" />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('applies the brand tone class to the fallback', () => {
    expect.assertions(1);
    renderWithProviders(<Avatar fallback="?" tone="brand" />);

    expect(screen.getByText('?')).toHaveClass('bg-primary');
  });
});
