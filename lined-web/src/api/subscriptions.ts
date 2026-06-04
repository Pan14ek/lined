import { api } from './client';
import type { SubscriptionDto } from '@/types';

export function getActiveSubscription(userId: number): Promise<SubscriptionDto> {
  return api.get(`subscriptions/${userId}/active`).json<SubscriptionDto>();
}

export function getSubscriptionHistory(userId: number): Promise<SubscriptionDto[]> {
  return api.get(`subscriptions/${userId}/history`).json<SubscriptionDto[]>();
}

export function startSubscription(data: {
  userId: number;
  planId: number;
}): Promise<SubscriptionDto> {
  return api.post('subscriptions', { json: data }).json<SubscriptionDto>();
}

export function cancelSubscription(userId: number): Promise<void> {
  return api.post(`subscriptions/${userId}/cancel-active`).then(() => undefined);
}
