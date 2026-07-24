import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueryStall } from '../useQueryStall';

describe('useQueryStall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts as not stalled', () => {
    expect.assertions(1);
    const { result } = renderHook(() => useQueryStall(true, 10_000));

    expect(result.current).toBe(false);
  });

  it('stays false before the timeout elapses', () => {
    expect.assertions(1);
    const { result } = renderHook(() => useQueryStall(true, 10_000));

    act(() => {
      vi.advanceTimersByTime(9_999);
    });

    expect(result.current).toBe(false);
  });

  it('flips to true once the timeout elapses while still loading', () => {
    expect.assertions(1);
    const { result } = renderHook(() => useQueryStall(true, 10_000));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current).toBe(true);
  });

  it('never stalls when isLoading is false', () => {
    expect.assertions(1);
    const { result } = renderHook(() => useQueryStall(false, 10_000));

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(result.current).toBe(false);
  });

  it('resets to false once loading finishes after having stalled', () => {
    expect.assertions(2);
    const { result, rerender } = renderHook(({ loading }) => useQueryStall(loading, 10_000), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });

    expect(result.current).toBe(false);
  });
});
