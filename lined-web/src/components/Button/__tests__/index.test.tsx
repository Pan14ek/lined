import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Button } from '..';

describe('Button', () => {
  it('renders its children and defaults to a primary, non-submitting button', () => {
    expect.assertions(3);
    renderWithProviders(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('bg-brand-green');
  });

  it('applies the danger variant classes when requested', () => {
    expect.assertions(1);
    renderWithProviders(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-red-600');
  });

  it('calls onClick when clicked and not pending', async () => {
    expect.assertions(1);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button and hides the label behind a spinner while pending', async () => {
    expect.assertions(4);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Button pending onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Save')).toHaveClass('invisible');
    expect(button.querySelector('svg')).toBeInTheDocument();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays disabled when disabled is passed without pending', () => {
    expect.assertions(2);
    renderWithProviders(<Button disabled>Save</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).not.toBeInTheDocument();
  });

  it('lets the type prop be overridden, e.g. for form submission', () => {
    expect.assertions(1);
    renderWithProviders(<Button type="submit">Create</Button>);

    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('type', 'submit');
  });
});
