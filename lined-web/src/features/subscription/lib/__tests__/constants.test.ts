import { describe, it, expect } from 'vitest';
import { QUERY_KEYS } from '../constants';

describe('QUERY_KEYS', () => {
  it('builds a stable key per user id for active-subscription lookups', () => {
    expect.assertions(2);
    expect(QUERY_KEYS.activeSubscription(1)).toStrictEqual(['subscriptions', 1, 'active']);
    expect(QUERY_KEYS.activeSubscription(1)).not.toStrictEqual(QUERY_KEYS.subscriptionHistory(1));
  });

  it('keeps the plans key independent of any user id', () => {
    expect.assertions(1);
    expect(QUERY_KEYS.plans).toStrictEqual(['plans']);
  });
});
