import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { Badge } from '..';

describe('Badge', () => {
  it('renders its label with the default neutral/soft styling', () => {
    expect.assertions(2);
    renderWithProviders(<Badge>Todo</Badge>);

    const badge = screen.getByText('Todo');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-muted');
  });

  it('applies the requested tone and variant', () => {
    expect.assertions(1);
    renderWithProviders(
      <Badge tone="danger" variant="solid">
        Overdue
      </Badge>,
    );

    expect(screen.getByText('Overdue')).toHaveClass('bg-destructive');
  });

  it('renders an icon when provided', () => {
    expect.assertions(1);
    renderWithProviders(<Badge icon={<span data-testid="icon" />}>Done</Badge>);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
