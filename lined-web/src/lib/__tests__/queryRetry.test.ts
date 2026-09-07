import { describe, it, expect } from 'vitest';
import { HTTPError } from 'ky';
import { MockHttpError } from '../apiClient';
import { defaultQueryRetry } from '../queryRetry';
import { HTTP_STATUS } from '@/test/httpStatus';

const httpError = (status: number) =>
  new HTTPError(new Response(null, { status }), new Request('http://localhost/'), {} as never);

describe('defaultQueryRetry', () => {
  it.each([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN, HTTP_STATUS.NOT_FOUND])(
    'does not retry a %i response',
    (status) => {
      expect.assertions(1);
      expect(defaultQueryRetry(0, httpError(status))).toBe(false);
    },
  );

  it('does not retry a mocked 404 (MockHttpError) either', () => {
    expect.assertions(1);
    expect(defaultQueryRetry(0, new MockHttpError(HTTP_STATUS.NOT_FOUND))).toBe(false);
  });

  it('retries a 500 up to the default limit', () => {
    expect.assertions(2);
    expect(defaultQueryRetry(0, httpError(HTTP_STATUS.INTERNAL_SERVER_ERROR))).toBe(true);
    expect(defaultQueryRetry(3, httpError(HTTP_STATUS.INTERNAL_SERVER_ERROR))).toBe(false);
  });

  it('retries a plain network error (no status) up to the default limit', () => {
    expect.assertions(2);
    expect(defaultQueryRetry(0, new Error('network down'))).toBe(true);
    expect(defaultQueryRetry(3, new Error('network down'))).toBe(false);
  });
});
