import { describe, it, expect } from 'vitest';
import {
  LOBBY_TYPES,
  LOBBY_TYPE_LABELS,
  LOBBY_TYPE_COLORS,
  LOBBY_TYPE_BADGE_CLASSES,
  LOBBY_TYPE_BORDER_CLASSES,
  LOBBY_TYPE_ICONS,
  LOBBY_TYPE_TAGLINES,
  lobbyAccentColor,
  QUERY_KEYS,
} from '../constants';

describe('LOBBY_TYPE_* lookup maps', () => {
  it('define an entry for every lobby type', () => {
    expect.assertions(6);
    for (const map of [
      LOBBY_TYPE_LABELS,
      LOBBY_TYPE_COLORS,
      LOBBY_TYPE_BADGE_CLASSES,
      LOBBY_TYPE_BORDER_CLASSES,
      LOBBY_TYPE_ICONS,
      LOBBY_TYPE_TAGLINES,
    ]) {
      expect(Object.keys(map).sort()).toStrictEqual([...LOBBY_TYPES].sort());
    }
  });

  it('does not define an entry for an unknown lobby type', () => {
    expect.assertions(1);
    expect(Object.keys(LOBBY_TYPE_LABELS)).not.toContain('UNKNOWN');
  });
});

describe('lobbyAccentColor', () => {
  it('builds a CSS variable reference from the lowercased lobby type', () => {
    expect.assertions(1);
    expect(lobbyAccentColor('COUPLE')).toBe('var(--color-lobby-couple)');
  });

  it('produces a different value for a different lobby type', () => {
    expect.assertions(1);
    expect(lobbyAccentColor('WORK')).not.toBe(lobbyAccentColor('FAMILY'));
  });
});

describe('QUERY_KEYS', () => {
  it('builds a stable, unique key per lobby id', () => {
    expect.assertions(2);
    expect(QUERY_KEYS.lobbyDetail(1)).toStrictEqual(['lobbies', 1]);
    expect(QUERY_KEYS.lobbyDetail(1)).not.toBe(QUERY_KEYS.lobbyDetail(2));
  });

  it('namespaces invite keys separately from lobby keys', () => {
    expect.assertions(1);
    expect(QUERY_KEYS.lobbyInvites(1)[0]).not.toBe(QUERY_KEYS.lobbyDetail(1)[0]);
  });
});
