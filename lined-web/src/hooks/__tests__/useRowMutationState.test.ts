import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRowMutationState } from '../useRowMutationState';

describe('useRowMutationState', () => {
  it('start marks a row busy and clears any stale error for it', () => {
    expect.assertions(2);
    const { result } = renderHook(() => useRowMutationState());

    act(() => result.current.setError(1, 'failed'));
    act(() => result.current.start(1));

    expect(result.current.busyId).toBe(1);
    expect(result.current.errors[1]).toBeUndefined();
  });

  it('finish clears the busy row without touching errors', () => {
    expect.assertions(2);
    const { result } = renderHook(() => useRowMutationState());

    act(() => result.current.start(2));
    act(() => result.current.setError(2, 'failed'));
    act(() => result.current.finish());

    expect(result.current.busyId).toBeNull();
    expect(result.current.errors[2]).toBe('failed');
  });
});
