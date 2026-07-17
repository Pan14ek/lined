import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HTTPError } from 'ky';
import { listPlans } from '@/api/plans';
import {
  getActiveSubscription,
  getSubscriptionHistory,
  startSubscription,
  cancelSubscription,
} from '@/api/subscriptions';
import { QUERY_KEYS } from '@/lib/constants';
import type { SubscriptionDto } from '@/types';

export const usePlans = () =>
  useQuery({
    queryKey: QUERY_KEYS.plans,
    queryFn: listPlans,
  });

/** A 404 means "no active subscription" (free plan), not an error. */
export const useActivePlan = (userId: number | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.activeSubscription(userId ?? 0),
    queryFn: async (): Promise<SubscriptionDto | null> => {
      try {
        return await getActiveSubscription(userId!);
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 404) return null;
        throw error;
      }
    },
    enabled: userId != null,
    retry: false,
  });

export const useSubscriptionHistory = (userId: number | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.subscriptionHistory(userId ?? 0),
    queryFn: () => getSubscriptionHistory(userId!),
    enabled: userId != null,
  });

export const useStartSubscription = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => startSubscription({ userId, planId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeSubscription(userId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscriptionHistory(userId) });
    },
  });
};

export const useCancelSubscription = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSubscription(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeSubscription(userId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscriptionHistory(userId) });
    },
  });
};
