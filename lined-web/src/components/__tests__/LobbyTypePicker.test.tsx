import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyTypePicker } from '../LobbyTypePicker';

describe('LobbyTypePicker', () => {
  it('renders all four lobby type options', () => {
    expect.assertions(4);
    render(<LobbyTypePicker value="COUPLE" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /couple/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /family/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /friends/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /work/i })).toBeInTheDocument();
  });

  it('marks the option matching the current value as checked', () => {
    expect.assertions(2);
    render(<LobbyTypePicker value="FAMILY" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /family/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: /couple/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onChange with the clicked lobby type', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LobbyTypePicker value="COUPLE" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /friends/i }));

    expect(onChange).toHaveBeenCalledWith('FRIENDS');
  });

  it('renders the options inside an accessible radiogroup', () => {
    expect.assertions(1);
    render(<LobbyTypePicker value="COUPLE" onChange={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: /lobby type/i })).toBeInTheDocument();
  });
});
