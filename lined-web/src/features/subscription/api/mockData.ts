import type { PlanDto, SubscriptionDto } from '@/features/subscription/model';

export const MOCK_PLANS: PlanDto[] = [
  {
    id: 1,
    name: 'Starter',
    priceUsd: 0,
    durationDays: 0,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Pro',
    priceUsd: 9.99,
    durationDays: 30,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Family',
    priceUsd: 14.99,
    durationDays: 30,
    createdAt: '2025-01-01T00:00:00Z',
  },
];

export const MOCK_SUBSCRIPTIONS: SubscriptionDto[] = [
  {
    id: 100,
    userId: 1,
    planId: 2,
    planName: 'Pro',
    startDate: '2026-03-28T00:00:00Z',
    endDate: '2026-04-28T00:00:00Z',
    active: true,
    createdAt: '2026-03-28T00:00:00Z',
  },
  {
    id: 99,
    userId: 1,
    planId: 1,
    planName: 'Starter',
    startDate: '2026-01-10T00:00:00Z',
    endDate: '2026-03-28T00:00:00Z',
    active: false,
    createdAt: '2026-01-10T00:00:00Z',
  },
];
