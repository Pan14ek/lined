import { describe, it, expect, vi, afterEach } from 'vitest';
import type { EventDto } from '@/types';
import {
  getGreeting,
  formatFullDate,
  formatRelativeEventTime,
  formatFreeSlotRange,
  formatTaskDueDate,
  formatHourRange,
  assignEventLanes,
} from '../calendarUtils';

afterEach(() => {
  vi.useRealTimers();
});

describe('getGreeting', () => {
  it('returns "Good morning" before noon', () => {
    expect.assertions(1);
    expect(getGreeting(new Date('2026-03-28T09:00:00'))).toBe('Good morning');
  });

  it('returns "Good afternoon" between noon and 6pm', () => {
    expect.assertions(1);
    expect(getGreeting(new Date('2026-03-28T14:00:00'))).toBe('Good afternoon');
  });

  it('returns "Good evening" after 6pm', () => {
    expect.assertions(1);
    expect(getGreeting(new Date('2026-03-28T19:00:00'))).toBe('Good evening');
  });

  it('defaults to the current time when no date is passed', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(getGreeting()).toBe('Good morning');
  });
});

describe('formatFullDate', () => {
  it('formats a date as "Weekday, D Month YYYY"', () => {
    expect.assertions(1);
    expect(formatFullDate(new Date('2026-03-28T10:00:00'))).toBe(
      'Saturday, 28 March 2026',
    );
  });
});

describe('formatRelativeEventTime', () => {
  it('labels an event today as "Today · <time>"', () => {
    expect.assertions(1);
    const now = new Date('2026-03-28T08:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeEventTime('2026-03-28T17:00:00')).toBe('Today · 5 PM');
  });

  it('labels an event tomorrow as "Tomorrow · <time>"', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(formatRelativeEventTime('2026-03-29T19:00:00')).toBe('Tomorrow · 7 PM');
  });

  it('labels a farther-out event with its weekday and date', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(formatRelativeEventTime('2026-04-03T20:00:00')).toBe('Fri, 3 Apr · 8 PM');
  });
});

describe('formatFreeSlotRange', () => {
  it('formats a same-AM/PM range with a single suffix', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T08:00:00'));
    expect(
      formatFreeSlotRange('2026-03-29T14:00:00', '2026-03-29T17:00:00'),
    ).toBe('Sunday 2–5 PM');
  });

  it('formats a range spanning AM to PM with both suffixes', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T08:00:00'));
    expect(
      formatFreeSlotRange('2026-03-29T11:00:00', '2026-03-29T14:00:00'),
    ).toBe('Sunday 11 AM–2 PM');
  });

  it('labels a slot later today as "Today"', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(
      formatFreeSlotRange('2026-03-28T14:00:00', '2026-03-28T17:00:00'),
    ).toBe('Today 2–5 PM');
  });

  it('labels a slot tomorrow as "Tomorrow"', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(
      formatFreeSlotRange('2026-03-29T14:00:00', '2026-03-29T17:00:00'),
    ).toBe('Tomorrow 2–5 PM');
  });
});

describe('formatTaskDueDate', () => {
  it('returns "Done" for a completed task regardless of due date', () => {
    expect.assertions(2);
    const result = formatTaskDueDate('2020-01-01', 'DONE');
    expect(result.label).toBe('Done');
    expect(result.isUrgent).toBe(false);
  });

  it('returns "No due date" for a task without a due date', () => {
    expect.assertions(2);
    const result = formatTaskDueDate(null, 'TODO');
    expect(result.label).toBe('No due date');
    expect(result.isUrgent).toBe(false);
  });

  it('marks a task due today as urgent', () => {
    expect.assertions(2);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00Z'));
    const result = formatTaskDueDate('2026-03-28', 'TODO');
    expect(result.label).toBe('Today');
    expect(result.isUrgent).toBe(true);
  });

  it('marks an overdue task as urgent with its formatted date', () => {
    expect.assertions(2);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00Z'));
    const result = formatTaskDueDate('2026-03-20', 'IN_PROGRESS');
    expect(result.label).toBe('Mar 20');
    expect(result.isUrgent).toBe(true);
  });

  it('shows a future due date without marking it urgent', () => {
    expect.assertions(2);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00Z'));
    const result = formatTaskDueDate('2026-04-01', 'TODO');
    expect(result.label).toBe('Apr 1');
    expect(result.isUrgent).toBe(false);
  });
});

describe('formatHourRange', () => {
  it('formats a same-AM/PM whole-hour range', () => {
    expect.assertions(1);
    expect(formatHourRange(14, 17)).toBe('2–5 PM');
  });

  it('formats a range crossing AM to PM', () => {
    expect.assertions(1);
    expect(formatHourRange(9, 12)).toBe('9 AM–12 PM');
  });

  it('includes minutes for a half-hour boundary', () => {
    expect.assertions(1);
    expect(formatHourRange(9.5, 11)).toBe('9:30–11 AM');
  });
});

describe('assignEventLanes', () => {
  const makeEvent = (id: number, startAt: string, endAt: string): EventDto => ({
    id,
    title: `Event ${id}`,
    location: null,
    shared: true,
    startAt,
    endAt,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 1,
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('returns an empty map for no events', () => {
    expect.assertions(1);
    expect(assignEventLanes([]).size).toBe(0);
  });

  it('assigns lane 0 with laneCount 1 to non-overlapping events', () => {
    expect.assertions(2);
    const events = [
      makeEvent(1, '2026-03-28T09:00:00Z', '2026-03-28T10:00:00Z'),
      makeEvent(2, '2026-03-28T11:00:00Z', '2026-03-28T12:00:00Z'),
    ];
    const lanes = assignEventLanes(events);
    expect(lanes.get(1)).toEqual({ lane: 0, laneCount: 1 });
    expect(lanes.get(2)).toEqual({ lane: 0, laneCount: 1 });
  });

  it('assigns two lanes to a pair of overlapping events', () => {
    expect.assertions(2);
    const events = [
      makeEvent(1, '2026-03-28T09:00:00Z', '2026-03-28T10:30:00Z'),
      makeEvent(2, '2026-03-28T10:00:00Z', '2026-03-28T11:00:00Z'),
    ];
    const lanes = assignEventLanes(events);
    expect(lanes.get(1)).toEqual({ lane: 0, laneCount: 2 });
    expect(lanes.get(2)).toEqual({ lane: 1, laneCount: 2 });
  });

  it('assigns three lanes to a three-way overlap', () => {
    expect.assertions(1);
    const events = [
      makeEvent(1, '2026-03-28T09:00:00Z', '2026-03-28T12:00:00Z'),
      makeEvent(2, '2026-03-28T10:00:00Z', '2026-03-28T11:00:00Z'),
      makeEvent(3, '2026-03-28T10:30:00Z', '2026-03-28T13:00:00Z'),
    ];
    const lanes = assignEventLanes(events);
    const laneCounts = [1, 2, 3].map((id) => lanes.get(id)?.laneCount);
    expect(laneCounts).toEqual([3, 3, 3]);
  });

  it('starts a fresh lane cluster once the previous cluster fully ends', () => {
    expect.assertions(2);
    const events = [
      makeEvent(1, '2026-03-28T09:00:00Z', '2026-03-28T10:00:00Z'),
      makeEvent(2, '2026-03-28T09:00:00Z', '2026-03-28T10:00:00Z'),
      makeEvent(3, '2026-03-28T12:00:00Z', '2026-03-28T13:00:00Z'),
    ];
    const lanes = assignEventLanes(events);
    expect(lanes.get(1)?.laneCount).toBe(2);
    expect(lanes.get(3)).toEqual({ lane: 0, laneCount: 1 });
  });
});
