import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Textarea } from '..';

describe('Textarea', () => {
  it('associates the label and calls onValueChange while typing', async () => {
    expect.assertions(2);
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Textarea label="Notes" value="" onValueChange={onValueChange} />);

    const textarea = screen.getByLabelText('Notes');
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, 'a');
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('shows the error and marks the field invalid', () => {
    expect.assertions(2);
    renderWithProviders(<Textarea label="Notes" error="Required" value="" onValueChange={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the control when disabled', () => {
    expect.assertions(1);
    renderWithProviders(<Textarea label="Notes" value="" onValueChange={vi.fn()} disabled />);

    expect(screen.getByLabelText('Notes')).toBeDisabled();
  });
});
