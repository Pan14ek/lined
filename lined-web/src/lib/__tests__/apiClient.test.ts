import { describe, it, expect } from 'vitest';
import { HTTPError } from 'ky';
import { MockHttpError, getErrorStatus, mockDelay, toSearchParams } from '../apiClient';
import { HTTP_STATUS } from '@/test/httpStatus';

describe('MockHttpError', () => {
  it('carries the given status and a default message', () => {
    expect.assertions(2);
    const error = new MockHttpError(HTTP_STATUS.NOT_FOUND);

    expect(error.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(error.message).toBe(`Mock HTTP error ${HTTP_STATUS.NOT_FOUND}`);
  });

  it('carries a custom message when given', () => {
    expect.assertions(1);
    const error = new MockHttpError(HTTP_STATUS.CONFLICT, 'Already exists');

    expect(error.message).toBe('Already exists');
  });
});

describe('getErrorStatus', () => {
  it('reads the status from a real ky HTTPError', () => {
    expect.assertions(1);
    const response = new Response(null, { status: HTTP_STATUS.NOT_FOUND });
    const error = new HTTPError(response, new Request('http://localhost/'), {} as never);

    expect(getErrorStatus(error)).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('reads the status from a MockHttpError', () => {
    expect.assertions(1);
    expect(getErrorStatus(new MockHttpError(HTTP_STATUS.CONFLICT))).toBe(HTTP_STATUS.CONFLICT);
  });

  it('returns undefined for an unrelated error', () => {
    expect.assertions(1);
    expect(getErrorStatus(new Error('network down'))).toBeUndefined();
  });

  it('returns undefined for a non-error value', () => {
    expect.assertions(1);
    expect(getErrorStatus('nope')).toBeUndefined();
  });
});

describe('mockDelay', () => {
  it('resolves after roughly the given duration', async () => {
    expect.assertions(1);
    const start = Date.now();
    await mockDelay(10);

    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });
});

describe('toSearchParams', () => {
  it('keeps defined string/number/boolean values', () => {
    expect.assertions(1);
    expect(toSearchParams({ q: 'alex', page: 0, active: true })).toStrictEqual({
      q: 'alex',
      page: 0,
      active: true,
    });
  });

  it('drops undefined and null entries', () => {
    expect.assertions(1);
    expect(toSearchParams({ q: 'alex', from: undefined, to: null })).toStrictEqual({ q: 'alex' });
  });

  it('returns an empty object when everything is undefined/null', () => {
    expect.assertions(1);
    expect(toSearchParams({ a: undefined, b: null })).toStrictEqual({});
  });
});
