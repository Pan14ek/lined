import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_PLANS, MOCK_SUBSCRIPTIONS } from './mockData';
import type { PlanDto, SubscriptionDto, SubscriptionCreateDto } from '@/features/subscription/model';

const plans: PlanDto[] = MOCK_PLANS.map((p) => ({ ...p }));
const subscriptions: SubscriptionDto[] = MOCK_SUBSCRIPTIONS.map((s) => ({ ...s }));
let nextId = 101;

const findActive = (userId: number): SubscriptionDto | undefined =>
  subscriptions.find((s) => s.userId === userId && s.active);

export const listPlans = async (): Promise<PlanDto[]> => {
  await mockDelay();
  return plans;
}

export const getPlan = async (id: number): Promise<PlanDto> => {
  await mockDelay();
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new MockHttpError(404, 'Plan not found');
  return plan;
}

export const getActiveSubscription = async (userId: number): Promise<SubscriptionDto> => {
  await mockDelay();
  const active = findActive(userId);
  if (!active) throw new MockHttpError(404, 'No active subscription');
  return active;
}

export const getSubscriptionHistory = async (userId: number): Promise<SubscriptionDto[]> => {
  await mockDelay();
  return subscriptions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export const startSubscription = async (data: SubscriptionCreateDto): Promise<SubscriptionDto> => {
  await mockDelay();
  if (findActive(data.userId)) throw new MockHttpError(409, 'An active subscription already exists');
  const plan = plans.find((p) => p.id === data.planId);
  if (!plan) throw new MockHttpError(404, 'Plan not found');

  const now = new Date();
  const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const created: SubscriptionDto = {
    id: nextId++,
    userId: data.userId,
    planId: plan.id,
    planName: plan.name,
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    active: true,
    createdAt: now.toISOString(),
  };
  subscriptions.unshift(created);
  return created;
}

export const cancelSubscription = async (userId: number): Promise<void> => {
  await mockDelay();
  const active = findActive(userId);
  if (!active) throw new MockHttpError(404, 'No active subscription');
  active.active = false;
  active.endDate = new Date().toISOString();
}
