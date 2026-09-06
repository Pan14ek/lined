import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { TextField } from '..';

describe('TextField', () => {
  it('associates the label and calls onValueChange while typing', async () => {
    expect.assertions(2);
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<TextField label="Email" value="" onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();

    await user.type(input, 'a');
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('shows the description when there is no error', () => {
    expect.assertions(1);
    renderWithProviders(
      <TextField label="Email" description="We'll never share it" value="" onValueChange={vi.fn()} />,
    );

    expect(screen.getByText("We'll never share it")).toBeInTheDocument();
  });

  it('shows the error instead of the description and marks the field invalid', () => {
    expect.assertions(3);
    renderWithProviders(
      <TextField
        label="Email"
        description="We'll never share it"
        error="Email is required"
        value=""
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    expect(screen.queryByText("We'll never share it")).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the input when disabled', () => {
    expect.assertions(1);
    renderWithProviders(<TextField label="Email" value="" onValueChange={vi.fn()} disabled />);

    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});
