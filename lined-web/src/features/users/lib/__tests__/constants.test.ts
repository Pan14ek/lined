import { describe, it, expect } from 'vitest';
import { QUERY_KEYS } from '../constants';

describe('QUERY_KEYS', () => {
  it('builds a stable key per user id', () => {
    expect.assertions(2);
    expect(QUERY_KEYS.user(1)).toStrictEqual(['users', 1]);
    expect(QUERY_KEYS.user(1)).not.toBe(QUERY_KEYS.user(2));
  });

  it('scopes search keys by the query string', () => {
    expect.assertions(2);
    expect(QUERY_KEYS.userSearch('alex')).toStrictEqual(['users', 'search', 'alex']);
    expect(QUERY_KEYS.userSearch('alex')).not.toStrictEqual(QUERY_KEYS.userSearch('nastia'));
  });

  it('does not confuse an empty search query with the base users list', () => {
    expect.assertions(1);
    expect(QUERY_KEYS.userSearch('')).not.toStrictEqual(QUERY_KEYS.users);
  });
});
