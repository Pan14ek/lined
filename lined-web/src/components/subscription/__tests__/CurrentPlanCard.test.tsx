import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_SUBSCRIPTIONS, MOCK_PLANS } from '@/test/data';
import { CurrentPlanCard } from '../CurrentPlanCard';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const activeSubscription = MOCK_SUBSCRIPTIONS[0]!;
const proPlan = MOCK_PLANS[1]!;

describe('CurrentPlanCard', () => {
  it('shows a loading skeleton while loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <CurrentPlanCard
        userId={1}
        activeSubscription={undefined}
        activePlanDetails={undefined}
        isLoading
      />,
    );

    expect(screen.getByTestId('current-plan-loading')).toBeInTheDocument();
  });

  it('shows the free-plan message when there is no active subscription', () => {
    expect.assertions(2);
    renderWithProviders(
      <CurrentPlanCard userId={1} activeSubscription={null} activePlanDetails={undefined} isLoading={false} />,
    );

    expect(screen.getByText('You are on the free plan.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel subscription' })).not.toBeInTheDocument();
  });

  it('renders the active plan name, price, and renewal date', () => {
    expect.assertions(2);
    renderWithProviders(
      <CurrentPlanCard
        userId={1}
        activeSubscription={activeSubscription}
        activePlanDetails={proPlan}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Pro · $9.99/month')).toBeInTheDocument();
    expect(screen.getByText('Renews 28 Apr 2026')).toBeInTheDocument();
  });

  it('requires confirmation before cancelling', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(
      <CurrentPlanCard
        userId={1}
        activeSubscription={activeSubscription}
        activePlanDetails={proPlan}
        isLoading={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));

    expect(screen.getByTestId('confirm-dialog-backdrop')).toBeInTheDocument();
  });

  it('shows an inline error message when cancelling fails', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/subscriptions/:userId/cancel-active`, () => new HttpResponse(null, { status: 404 })),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <CurrentPlanCard
        userId={1}
        activeSubscription={activeSubscription}
        activePlanDetails={proPlan}
        isLoading={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    await user.click(screen.getAllByRole('button', { name: 'Cancel subscription' })[1]!);

    expect(
      await screen.findByText('You have no active subscription to cancel'),
    ).toBeInTheDocument();
  });
});
