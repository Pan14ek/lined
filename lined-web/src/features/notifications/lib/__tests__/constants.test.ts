import { describe, it, expect } from 'vitest';
import { QUERY_KEYS } from '../constants';

describe('QUERY_KEYS', () => {
  it('builds a stable key per lobby id for lobby notification preferences', () => {
    expect.assertions(2);
    expect(QUERY_KEYS.lobbyNotificationPreferences(1)).toStrictEqual([
      'notifications',
      'lobby-preferences',
      1,
    ]);
    expect(QUERY_KEYS.lobbyNotificationPreferences(1)).not.toStrictEqual(
      QUERY_KEYS.lobbyNotificationPreferences(2),
    );
  });

  it('keeps global preferences and "mine" under distinct keys', () => {
    expect.assertions(1);
    expect(QUERY_KEYS.notificationPreferences).not.toStrictEqual(QUERY_KEYS.myNotifications);
  });
});
