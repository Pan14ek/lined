export const QUERY_KEYS = {
  plans: ['plans'] as const,
  activeSubscription: (userId: number) => ['subscriptions', userId, 'active'] as const,
  subscriptionHistory: (userId: number) => ['subscriptions', userId, 'history'] as const,
} as const;
