import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleRow } from '..';

describe('ToggleRow', () => {
  it('renders the label and description', () => {
    expect.assertions(2);
    render(
      <ToggleRow label="Notify assignee" description="Send a notification" checked={false} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Notify assignee')).toBeInTheDocument();
    expect(screen.getByText('Send a notification')).toBeInTheDocument();
  });

  it('reflects checked=true via aria-checked', () => {
    expect.assertions(1);
    render(<ToggleRow label="Shared" description="Visible to all" checked={true} onChange={vi.fn()} />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects checked=false via aria-checked', () => {
    expect.assertions(1);
    render(<ToggleRow label="Shared" description="Visible to all" checked={false} onChange={vi.fn()} />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the flipped value when clicked', async () => {
    expect.assertions(1);
    const onChange = vi.fn();
    render(<ToggleRow label="Shared" description="Visible to all" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
