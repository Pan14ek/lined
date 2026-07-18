import { describe, it, expect } from 'vitest';
import { DEFAULT_LEGEND_ITEMS, QUERY_KEYS } from '../constants';

describe('DEFAULT_LEGEND_ITEMS', () => {
  it('has a label and color for every entry', () => {
    expect.assertions(1);
    expect(DEFAULT_LEGEND_ITEMS.every((item) => item.label.length > 0 && item.color.length > 0)).toBe(
      true,
    );
  });

  it('includes an entry for every lobby type plus the free-slot legend', () => {
    expect.assertions(1);
    const labels = DEFAULT_LEGEND_ITEMS.map((item) => item.label);
    expect(labels).toStrictEqual(['Couple', 'Family', 'Friends', 'Work', 'Free slot']);
  });
});

describe('QUERY_KEYS', () => {
  it('scopes conflict keys by lobby, start, and end', () => {
    expect.assertions(2);
    expect(QUERY_KEYS.eventConflicts(1, '2026-01-01', '2026-01-02')).toStrictEqual([
      'calendar',
      'conflicts',
      1,
      '2026-01-01',
      '2026-01-02',
    ]);
    expect(QUERY_KEYS.eventConflicts(1, '2026-01-01', '2026-01-02')).not.toStrictEqual(
      QUERY_KEYS.eventConflicts(2, '2026-01-01', '2026-01-02'),
    );
  });
});
