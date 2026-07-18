import { describe, it, expect } from 'vitest';
import { HTTPError } from 'ky';
import { getApiErrorMessage } from '../apiErrors';

const makeHttpError = (status: number): HTTPError => {
  const response = new Response(null, { status });
  return new HTTPError(response, new Request('http://localhost/'), {} as never);
}

describe('getApiErrorMessage', () => {
  it('returns the mapped message for a matching status code', () => {
    expect.assertions(1);
    const error = makeHttpError(400);
    expect(getApiErrorMessage(error, { 400: 'Bad input' }, 'Fallback')).toBe('Bad input');
  });

  it('returns the fallback for a non-mapped status code', () => {
    expect.assertions(1);
    const error = makeHttpError(500);
    expect(getApiErrorMessage(error, { 400: 'Bad input' }, 'Fallback')).toBe('Fallback');
  });

  it('returns the fallback for a non-HTTPError value', () => {
    expect.assertions(1);
    expect(getApiErrorMessage(new Error('network down'), { 400: 'Bad input' }, 'Fallback')).toBe(
      'Fallback',
    );
  });
});
