import { describe, it, expect } from 'vitest';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_BADGE_CLASSES,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  QUERY_KEYS,
} from '../constants';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

describe('TASK_STATUS_* lookup maps', () => {
  it('define an entry for every task status', () => {
    expect.assertions(3);
    for (const map of [TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_STATUS_BADGE_CLASSES]) {
      expect(Object.keys(map).sort()).toStrictEqual([...STATUSES].sort());
    }
  });
});

describe('TASK_PRIORITY_* lookup maps', () => {
  it('define an entry for every priority in TASK_PRIORITY_OPTIONS', () => {
    expect.assertions(2);
    expect(Object.keys(TASK_PRIORITY_COLORS).sort()).toStrictEqual([...TASK_PRIORITY_OPTIONS].sort());
    expect(Object.keys(TASK_PRIORITY_LABELS).sort()).toStrictEqual([...TASK_PRIORITY_OPTIONS].sort());
  });

  it('lists exactly HIGH, MEDIUM, LOW as the available priorities', () => {
    expect.assertions(1);
    expect([...TASK_PRIORITY_OPTIONS].sort()).toStrictEqual(['HIGH', 'LOW', 'MEDIUM']);
  });
});

describe('QUERY_KEYS', () => {
  it('builds a stable key per lobby id', () => {
    expect.assertions(1);
    expect(QUERY_KEYS.lobbyTasks(1)).toStrictEqual(['tasks', 'lobby', 1]);
  });

  it('keeps "mine" and the base list under different keys', () => {
    expect.assertions(1);
    expect(QUERY_KEYS.myTasks).not.toStrictEqual(QUERY_KEYS.tasks);
  });
});
