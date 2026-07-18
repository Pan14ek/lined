import { USE_MOCKS } from '@/lib/apiClient';
import * as devApi from './dev';
import * as prodApi from './prod';

const impl = USE_MOCKS ? devApi : prodApi;

export const {
  listPlans,
  getPlan,
  getActiveSubscription,
  getSubscriptionHistory,
  startSubscription,
  cancelSubscription,
} = impl;
