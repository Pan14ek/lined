import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MOCK_SUBSCRIPTIONS } from '@/features/subscription/api/mockData';
import { SubscriptionHistoryCard } from '../SubscriptionHistoryCard';

const planPriceById = new Map([
  [1, 0],
  [2, 9.99],
]);

describe('SubscriptionHistoryCard', () => {
  it('shows a loading skeleton while loading', () => {
    expect.assertions(1);
    render(
      <SubscriptionHistoryCard
        history={undefined}
        isLoading
        isError={false}
        onRetry={vi.fn()}
        planPriceById={planPriceById}
      />,
    );

    expect(screen.getByTestId('subscription-history-loading')).toBeInTheDocument();
  });

  it('renders each subscription with an ACTIVE or ENDED badge', () => {
    expect.assertions(4);
    render(
      <SubscriptionHistoryCard
        history={MOCK_SUBSCRIPTIONS}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        planPriceById={planPriceById}
      />,
    );

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('ENDED')).toBeInTheDocument();
    expect(screen.getByText('Pro · $9.99/month')).toBeInTheDocument();
    expect(screen.getByText('Starter · Free')).toBeInTheDocument();
  });

  it('shows an empty-history message when there is no history', () => {
    expect.assertions(1);
    render(
      <SubscriptionHistoryCard
        history={[]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        planPriceById={planPriceById}
      />,
    );

    expect(screen.getByText('No subscription history yet.')).toBeInTheDocument();
  });

  it('shows an error state with a working retry action when history fails to load', async () => {
    expect.assertions(2);
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <SubscriptionHistoryCard
        history={undefined}
        isLoading={false}
        isError
        onRetry={onRetry}
        planPriceById={planPriceById}
      />,
    );

    expect(screen.getByText("Couldn't load your subscription history")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
