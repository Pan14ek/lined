import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { ErrorState } from '..';

describe('ErrorState', () => {
  it('renders the default message and calls onRetry when the retry button is clicked', async () => {
    expect.assertions(2);
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ErrorState onRetry={onRetry} />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a custom title and description', () => {
    expect.assertions(2);
    renderWithProviders(<ErrorState title="Could not load tasks" description="Check your connection" />);

    expect(screen.getByText('Could not load tasks')).toBeInTheDocument();
    expect(screen.getByText('Check your connection')).toBeInTheDocument();
  });

  it('renders no action button when neither onRetry nor action is given', () => {
    expect.assertions(1);
    renderWithProviders(<ErrorState title="Could not load tasks" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('prefers a custom action over onRetry when both are given', async () => {
    expect.assertions(2);
    const onRetry = vi.fn();
    const customAction = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ErrorState onRetry={onRetry} action={{ label: 'Go back', onClick: customAction }} />);

    await user.click(screen.getByRole('button', { name: 'Go back' }));

    expect(customAction).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
