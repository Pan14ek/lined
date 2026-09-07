import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { SwitchField } from '..';

describe('SwitchField', () => {
  it('renders the label, description, and switch state', () => {
    expect.assertions(3);
    renderWithProviders(
      <SwitchField label="Email notifications" description="Get notified by email" checked onCheckedChange={vi.fn()} />,
    );

    expect(screen.getByText('Email notifications')).toBeInTheDocument();
    expect(screen.getByText('Get notified by email')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Email notifications' })).toBeChecked();
  });

  it('calls onCheckedChange when toggled', async () => {
    expect.assertions(1);
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SwitchField label="Email notifications" checked={false} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('switch', { name: 'Email notifications' }));

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('disables the switch when disabled', () => {
    expect.assertions(1);
    renderWithProviders(<SwitchField label="Email notifications" checked={false} onCheckedChange={vi.fn()} disabled />);

    expect(screen.getByRole('switch', { name: 'Email notifications' })).toHaveAttribute('aria-disabled', 'true');
  });
});
