import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Switch } from '..';

describe('Switch', () => {
  it('reflects the checked state', () => {
    expect.assertions(1);
    renderWithProviders(<Switch checked aria-label="Notifications" onCheckedChange={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Notifications' })).toBeChecked();
  });

  it('calls onCheckedChange with the toggled value when clicked', async () => {
    expect.assertions(1);
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Switch checked={false} aria-label="Notifications" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('switch', { name: 'Notifications' }));

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('does not fire onCheckedChange when disabled', async () => {
    expect.assertions(2);
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Switch checked={false} disabled aria-label="Notifications" onCheckedChange={onCheckedChange} />,
    );

    const el = screen.getByRole('switch', { name: 'Notifications' });
    expect(el).toHaveAttribute('aria-disabled', 'true');

    await user.click(el);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
