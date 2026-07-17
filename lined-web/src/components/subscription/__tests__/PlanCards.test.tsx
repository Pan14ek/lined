import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_PLANS } from '@/test/data';
import { PlanCards } from '../PlanCards';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('PlanCards', () => {
  it('shows a loading skeleton while loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <PlanCards userId={1} plans={undefined} isLoading currentPlanId={undefined} />,
    );

    expect(screen.getByTestId('plan-cards-loading')).toBeInTheDocument();
  });

  it('renders every plan and highlights/disables the current one', () => {
    expect.assertions(4);
    renderWithProviders(
      <PlanCards userId={1} plans={MOCK_PLANS} isLoading={false} currentPlanId={2} />,
    );

    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Your plan' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Subscribe' })).toHaveLength(2);
    expect(screen.getByText('Starter')).toBeInTheDocument();
  });

  it('posts the userId/planId payload when subscribing', async () => {
    expect.assertions(1);
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE}/subscriptions`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          {
            id: 300,
            userId: 7,
            planId: 3,
            planName: 'Family',
            startDate: '2026-07-18T00:00:00Z',
            endDate: '2026-08-17T00:00:00Z',
            active: true,
            createdAt: '2026-07-18T00:00:00Z',
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <PlanCards userId={7} plans={MOCK_PLANS} isLoading={false} currentPlanId={undefined} />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Subscribe' })[0]!);

    expect(capturedBody).toEqual({ userId: 7, planId: 1 });
  });

  it('shows an inline error message when subscribing fails with a 409', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/subscriptions`, () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'An active subscription already exists' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <PlanCards userId={1} plans={MOCK_PLANS} isLoading={false} currentPlanId={undefined} />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Subscribe' })[0]!);

    expect(
      await screen.findByText('You already have an active plan — cancel it first to switch'),
    ).toBeInTheDocument();
  });
});
