import { describe, it, expect } from 'vitest';
import { formatShortDate, formatPlanPrice } from '../subscriptionUtils';

describe('formatShortDate', () => {
  it('formats an ISO date as "D MMM YYYY"', () => {
    expect.assertions(1);
    expect(formatShortDate('2026-03-28T00:00:00Z')).toBe('28 Mar 2026');
  });

  it('formats a single-digit day without leading zero', () => {
    expect.assertions(1);
    expect(formatShortDate('2026-01-05T00:00:00Z')).toBe('5 Jan 2026');
  });
});

describe('formatPlanPrice', () => {
  it('formats a non-zero price with two decimals and a dollar sign', () => {
    expect.assertions(1);
    expect(formatPlanPrice(9.99)).toBe('$9.99');
  });

  it('pads a whole-dollar price to two decimals', () => {
    expect.assertions(1);
    expect(formatPlanPrice(15)).toBe('$15.00');
  });

  it('labels a zero price as "Free"', () => {
    expect.assertions(1);
    expect(formatPlanPrice(0)).toBe('Free');
  });
});
