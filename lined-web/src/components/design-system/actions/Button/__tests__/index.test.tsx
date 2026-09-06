import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { Button } from '..';

describe('Button', () => {
  it('renders its children and defaults to a non-submitting primary button', () => {
    expect.assertions(2);
    renderWithProviders(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('calls onClick when clicked', async () => {
    expect.assertions(1);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders leading and trailing icons', () => {
    expect.assertions(2);
    renderWithProviders(
      <Button leadingIcon={<span data-testid="leading" />} trailingIcon={<span data-testid="trailing" />}>
        Save
      </Button>,
    );

    expect(screen.getByTestId('leading')).toBeInTheDocument();
    expect(screen.getByTestId('trailing')).toBeInTheDocument();
  });

  it('disables the button and hides the label behind a spinner while loading', async () => {
    expect.assertions(4);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Save')).toHaveClass('invisible');

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays disabled when disabled is passed without loading, and shows no spinner', () => {
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
