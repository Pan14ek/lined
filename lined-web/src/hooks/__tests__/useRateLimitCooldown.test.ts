import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '@/lib/apiClient';
import { HTTP_STATUS } from '@/lib/httpStatus';
import { useRateLimitCooldown } from '../useRateLimitCooldown';

const STORAGE_KEY = 'lined.rate-limit.cooldown.sign-in';

const createRateLimitError = (seconds = 5) => new RateLimitError(
  new Response(null, { status: HTTP_STATUS.TOO_MANY_REQUESTS }),
  new Request('http://localhost/'),
  {} as never,
  seconds,
);

describe('useRateLimitCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T20:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('persists a server retry deadline and counts down', () => {
    expect.assertions(3);
    const { result, unmount } = renderHook(() => useRateLimitCooldown(
      'sign-in',
      createRateLimitError(),
    ));

    act(() => vi.advanceTimersByTime(250));

    expect(result.current).toBe(5);
    expect(Number(window.localStorage.getItem(STORAGE_KEY))).toBe(Date.now() + 5_000);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(4);
    unmount();
  });

  it('restores a persisted deadline and removes it on expiry', () => {
    expect.assertions(3);
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + 1_000));

    const { result } = renderHook(() => useRateLimitCooldown('sign-in', null));
    expect(result.current).toBe(1);

    act(() => vi.advanceTimersByTime(1_000));

    expect(result.current).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores malformed persisted deadlines and non-rate-limit errors', () => {
    expect.assertions(1);
    window.localStorage.setItem(STORAGE_KEY, 'not-a-deadline');

    const { result } = renderHook(() => useRateLimitCooldown('sign-in', new Error('network')));

    expect(result.current).toBe(0);
  });
});
