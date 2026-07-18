import { api, requestVoid } from '@/lib/apiClient';
import type { PlanDto, SubscriptionDto, SubscriptionCreateDto } from '@/features/subscription/model';

export const listPlans = (): Promise<PlanDto[]> => {
  return api.get('plans').json<PlanDto[]>();
}

export const getPlan = (id: number): Promise<PlanDto> => {
  return api.get(`plans/${id}`).json<PlanDto>();
}

export const getActiveSubscription = (userId: number): Promise<SubscriptionDto> => {
  return api.get(`subscriptions/${userId}/active`).json<SubscriptionDto>();
}

export const getSubscriptionHistory = (userId: number): Promise<SubscriptionDto[]> => {
  return api.get(`subscriptions/${userId}/history`).json<SubscriptionDto[]>();
}

export const startSubscription = (data: SubscriptionCreateDto): Promise<SubscriptionDto> => {
  return api.post('subscriptions', { json: data }).json<SubscriptionDto>();
}

export const cancelSubscription = (userId: number): Promise<void> => {
  return requestVoid('post', `subscriptions/${userId}/cancel-active`);
}
