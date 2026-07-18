export interface PlanDto {
  id: number;
  name: string;
  priceUsd: number;
  durationDays: number;
  createdAt: string;
}

export interface SubscriptionDto {
  id: number;
  userId: number;
  planId: number;
  planName: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

export interface SubscriptionCreateDto {
  userId: number;
  planId: number;
}
