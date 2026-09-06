import { describe, it, expect, vi } from 'vitest';
import { X } from 'lucide-react';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { IconButton } from '..';

describe('IconButton', () => {
  it('renders the icon behind an accessible name', () => {
    expect.assertions(2);
    renderWithProviders(<IconButton icon={<X />} aria-label="Close" />);

    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    expect.assertions(1);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<IconButton icon={<X />} aria-label="Close" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled and does not fire onClick', async () => {
    expect.assertions(2);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<IconButton icon={<X />} aria-label="Close" disabled onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
