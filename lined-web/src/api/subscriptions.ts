import { api, requestVoid } from './client';
import type { SubscriptionDto, SubscriptionCreateDto } from '@/types';

export function getActiveSubscription(userId: number): Promise<SubscriptionDto> {
  return api.get(`subscriptions/${userId}/active`).json<SubscriptionDto>();
}

export function getSubscriptionHistory(userId: number): Promise<SubscriptionDto[]> {
  return api.get(`subscriptions/${userId}/history`).json<SubscriptionDto[]>();
}

export function startSubscription(data: SubscriptionCreateDto): Promise<SubscriptionDto> {
  return api.post('subscriptions', { json: data }).json<SubscriptionDto>();
}

export function cancelSubscription(userId: number): Promise<void> {
  return requestVoid('post', `subscriptions/${userId}/cancel-active`);
}
