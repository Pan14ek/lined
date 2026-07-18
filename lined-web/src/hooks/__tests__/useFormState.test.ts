import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFormState } from '../useFormState';

interface Values {
  name: string;
  age: string;
}

const validate = (values: Values): Partial<Record<keyof Values, string>> => {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  return errors;
}

describe('useFormState', () => {
  it('updates a single field via set without touching the others', () => {
    expect.assertions(2);
    const { result } = renderHook(() => useFormState<Values>({ name: '', age: '' }, validate));

    act(() => result.current.set('name', 'Alex'));

    expect(result.current.values.name).toBe('Alex');
    expect(result.current.values.age).toBe('');
  });

  it('tracks hasErrors and per-field touched state', () => {
    expect.assertions(3);
    const { result } = renderHook(() => useFormState<Values>({ name: '', age: '' }, validate));

    expect(result.current.hasErrors).toBe(true);

    act(() => result.current.markTouched('name'));
    expect(result.current.touched.name).toBe(true);
    expect(result.current.touched.age).toBeUndefined();
  });

  it('markAllTouched marks every field as touched', () => {
    expect.assertions(2);
    const { result } = renderHook(() => useFormState<Values>({ name: '', age: '' }, validate));

    act(() => result.current.markAllTouched());

    expect(result.current.touched.name).toBe(true);
    expect(result.current.touched.age).toBe(true);
  });
});
