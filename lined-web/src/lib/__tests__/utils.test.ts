import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('joins multiple class name strings', () => {
    expect.assertions(1);
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect.assertions(1);
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
  });

  it('merges conflicting Tailwind utilities, keeping the last one', () => {
    expect.assertions(1);
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('resolves conditional object entries', () => {
    expect.assertions(1);
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});
