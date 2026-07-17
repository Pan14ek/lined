import { http, HttpResponse } from 'msw';
import { MOCK_SUBSCRIPTIONS, MOCK_PLANS } from '../data';
import type { SubscriptionDto } from '@/types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

let mockSubscriptions: SubscriptionDto[] = [...MOCK_SUBSCRIPTIONS];
let nextSubscriptionId = 101;

function findActive(userId: number): SubscriptionDto | undefined {
  return mockSubscriptions.find((s) => s.userId === userId && s.active);
}

export const subscriptionHandlers = [
  http.get(`${BASE}/subscriptions/:userId/active`, ({ params }) => {
    const userId = Number(params['userId']);
    const active = findActive(userId);
    if (!active) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(active);
  }),

  http.get(`${BASE}/subscriptions/:userId/history`, ({ params }) => {
    const userId = Number(params['userId']);
    return HttpResponse.json(
      mockSubscriptions
        .filter((s) => s.userId === userId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    );
  }),

  http.post(`${BASE}/subscriptions`, async ({ request }) => {
    const body = (await request.json()) as { userId: number; planId: number };
    if (findActive(body.userId)) {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'An active subscription already exists' },
        { status: 409 },
      );
    }
    const plan = MOCK_PLANS.find((p) => p.id === body.planId);
    if (!plan) return new HttpResponse(null, { status: 404 });

    const now = new Date();
    const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const created: SubscriptionDto = {
      id: nextSubscriptionId++,
      userId: body.userId,
      planId: plan.id,
      planName: plan.name,
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      active: true,
      createdAt: now.toISOString(),
    };
    mockSubscriptions = [created, ...mockSubscriptions];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post(`${BASE}/subscriptions/:userId/cancel-active`, ({ params }) => {
    const userId = Number(params['userId']);
    const active = findActive(userId);
    if (!active) return new HttpResponse(null, { status: 404 });

    const cancelled: SubscriptionDto = {
      ...active,
      active: false,
      endDate: new Date().toISOString(),
    };
    mockSubscriptions = mockSubscriptions.map((s) => (s.id === cancelled.id ? cancelled : s));
    return HttpResponse.json(cancelled);
  }),
];
