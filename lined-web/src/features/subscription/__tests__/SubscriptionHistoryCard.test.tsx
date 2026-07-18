import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      <SubscriptionHistoryCard history={undefined} isLoading planPriceById={planPriceById} />,
    );

    expect(screen.getByTestId('subscription-history-loading')).toBeInTheDocument();
  });

  it('renders each subscription with an ACTIVE or ENDED badge', () => {
    expect.assertions(4);
    render(
      <SubscriptionHistoryCard
        history={MOCK_SUBSCRIPTIONS}
        isLoading={false}
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
    render(<SubscriptionHistoryCard history={[]} isLoading={false} planPriceById={planPriceById} />);

    expect(screen.getByText('No subscription history yet.')).toBeInTheDocument();
  });
});
