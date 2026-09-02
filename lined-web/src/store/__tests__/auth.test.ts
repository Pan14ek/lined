import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({ accessToken: null, status: 'unauthenticated' });
  });

  it('keeps the access token out of browser persistence', () => {
    expect.assertions(3);
    useAuthStore.getState().setAccessToken('volatile-token');

    expect(useAuthStore.getState().accessToken).toBe('volatile-token');
    expect(localStorage.getItem('lined-auth')).toBeNull();
    expect(sessionStorage.getItem('lined-auth')).toBeNull();
  });
});
