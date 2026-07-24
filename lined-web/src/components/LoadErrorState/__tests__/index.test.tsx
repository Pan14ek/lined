import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { LoadErrorState } from '..';

describe('LoadErrorState', () => {
  it('renders the generic error message and a retry action by default', () => {
    expect.assertions(2);
    renderWithProviders(<LoadErrorState onRetry={vi.fn()} testId="load-error" />);

    expect(screen.getByTestId('load-error')).toHaveTextContent(
      "Something went wrong — please try again",
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders a custom message when one is given', () => {
    expect.assertions(1);
    renderWithProviders(<LoadErrorState onRetry={vi.fn()} message="Couldn't load tasks" />);

    expect(screen.getByText("Couldn't load tasks")).toBeInTheDocument();
  });

  it('calls onRetry exactly once when the retry button is clicked', async () => {
    expect.assertions(1);
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<LoadErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
