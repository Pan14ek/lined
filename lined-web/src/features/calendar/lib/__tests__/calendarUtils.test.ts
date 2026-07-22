import { describe, it, expect, vi, afterEach } from 'vitest';
import i18next from 'i18next';
import type { EventDto } from '@/features/calendar/model';
import {
  getGreeting,
  formatFullDate,
  formatMonthYear,
  formatRelativeEventTime,
  formatRelativeTimeAgo,
  formatFreeSlotRange,
  formatTaskDueDate,
  formatHourRange,
  hourRangeToIso,
  assignEventLanes,
  getMonthGridDays,
  isSameMonth,
  eventTouchesDay,
  clipEventToDay,
  computeFreeSlots,
} from '../calendarUtils';
import { dates, locales, statuses, texts } from './calendarUtils.test.helper';

afterEach(() => {
  vi.useRealTimers();
  void i18next.changeLanguage(locales.english);
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

describe('formatRelativeTimeAgo', () => {
  it('labels a moment under a minute old as "Just now"', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:30'));
    expect(formatRelativeTimeAgo('2026-03-28T08:00:00')).toBe('Just now');
  });

  it('pluralises minutes ago', () => {
    expect.assertions(2);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:10:00'));
    expect(formatRelativeTimeAgo('2026-03-28T08:09:00')).toBe('1 minute ago');
    expect(formatRelativeTimeAgo('2026-03-28T08:00:00')).toBe('10 minutes ago');
  });

  it('pluralises hours ago', () => {
    expect.assertions(2);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(formatRelativeTimeAgo('2026-03-28T07:00:00')).toBe('1 hour ago');
    expect(formatRelativeTimeAgo('2026-03-28T05:00:00')).toBe('3 hours ago');
  });

  it('labels a timestamp from the previous calendar day as "Yesterday"', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(formatRelativeTimeAgo('2026-03-27T07:00:00')).toBe('Yesterday');
  });

  it('pluralises days ago for the rest of the week', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(formatRelativeTimeAgo('2026-03-25T08:00:00')).toBe('3 days ago');
  });

  it('falls back to a "D Mon" date once older than a week', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00'));
    expect(formatRelativeTimeAgo('2026-03-10T08:00:00')).toBe('10 Mar');
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

describe('hourRangeToIso', () => {
  it('converts a whole-hour range on a given day to ISO timestamps', () => {
    expect.assertions(2);
    const day = new Date(2026, 2, 29); // local midnight, 29 Mar 2026
    const { start, end } = hourRangeToIso(day, 14, 17);
    expect(new Date(start).getHours()).toBe(14);
    expect(new Date(end).getHours()).toBe(17);
  });

  it('converts a half-hour fraction to minutes', () => {
    expect.assertions(2);
    const day = new Date(2026, 2, 29);
    const { start } = hourRangeToIso(day, 9.5, 11);
    expect(new Date(start).getHours()).toBe(9);
    expect(new Date(start).getMinutes()).toBe(30);
  });

  it('handles the midnight edge (hour 0)', () => {
    expect.assertions(2);
    const day = new Date(2026, 2, 29);
    const { start, end } = hourRangeToIso(day, 0, 1);
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(end).getHours()).toBe(1);
  });

  it('does not mutate the day passed in', () => {
    expect.assertions(1);
    const day = new Date(2026, 2, 29, 6, 0, 0, 0);
    hourRangeToIso(day, 14, 17);
    expect(day.getHours()).toBe(6);
  });
});

describe('eventTouchesDay', () => {
  const makeEvent = (startAt: string, endAt: string): EventDto => ({
    id: 1,
    title: 'Movie Night',
    location: null,
    shared: true,
    startAt,
    endAt,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 1,
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('is true when the event starts and ends on the same given day', () => {
    expect.assertions(1);
    const event = makeEvent('2026-07-18T09:00:00', '2026-07-18T10:00:00');
    expect(eventTouchesDay(event, new Date('2026-07-18T00:00:00'))).toBe(true);
  });

  it('is true for the start day of a midnight-spanning event', () => {
    expect.assertions(1);
    const event = makeEvent('2026-07-18T23:30:00', '2026-07-19T02:00:00');
    expect(eventTouchesDay(event, new Date('2026-07-18T00:00:00'))).toBe(true);
  });

  it('is true for the end day of a midnight-spanning event', () => {
    expect.assertions(1);
    const event = makeEvent('2026-07-18T23:30:00', '2026-07-19T02:00:00');
    expect(eventTouchesDay(event, new Date('2026-07-19T00:00:00'))).toBe(true);
  });

  it('is false for a day the event does not touch at all', () => {
    expect.assertions(1);
    const event = makeEvent('2026-07-18T23:30:00', '2026-07-19T02:00:00');
    expect(eventTouchesDay(event, new Date('2026-07-20T00:00:00'))).toBe(false);
  });

  it('is true for a day fully inside a multi-day event, touching neither endpoint', () => {
    expect.assertions(2);
    const event = makeEvent('2026-07-17T10:00:00', '2026-07-20T10:00:00');
    expect(eventTouchesDay(event, new Date('2026-07-18T00:00:00'))).toBe(true);
    expect(eventTouchesDay(event, new Date('2026-07-19T00:00:00'))).toBe(true);
  });
});

describe('clipEventToDay', () => {
  const makeEvent = (startAt: string, endAt: string): EventDto => ({
    id: 1,
    title: 'Movie Night',
    location: null,
    shared: true,
    startAt,
    endAt,
    timezone: 'UTC',
    lobbyId: 1,
    ownerId: 1,
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('leaves a same-day event untouched', () => {
    expect.assertions(2);
    const event = makeEvent('2026-07-18T09:00:00', '2026-07-18T10:00:00');
    const clipped = clipEventToDay(event, new Date('2026-07-18T00:00:00'));
    expect(new Date(clipped.startAt).toISOString()).toBe(new Date('2026-07-18T09:00:00').toISOString());
    expect(new Date(clipped.endAt).toISOString()).toBe(new Date('2026-07-18T10:00:00').toISOString());
  });

  it('clips the end to midnight on the start day of a midnight-spanning event', () => {
    expect.assertions(2);
    const event = makeEvent('2026-07-18T23:30:00', '2026-07-19T02:00:00');
    const clipped = clipEventToDay(event, new Date('2026-07-18T00:00:00'));
    expect(new Date(clipped.startAt).toISOString()).toBe(new Date('2026-07-18T23:30:00').toISOString());
    expect(new Date(clipped.endAt).getHours()).toBe(0);
  });

  it('clips the start to midnight on the end day of a midnight-spanning event', () => {
    expect.assertions(2);
    const event = makeEvent('2026-07-18T23:30:00', '2026-07-19T02:00:00');
    const clipped = clipEventToDay(event, new Date('2026-07-19T00:00:00'));
    expect(new Date(clipped.startAt).getHours()).toBe(0);
    expect(new Date(clipped.endAt).toISOString()).toBe(new Date('2026-07-19T02:00:00').toISOString());
  });
});

describe('computeFreeSlots', () => {
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

  it('caps the free slot before a midnight-spanning event at its real start, not GRID_END_HOUR', () => {
    expect.assertions(1);
    // A gap from early evening up to 11:30 PM, when Movie Night starts and
    // runs past midnight — the bug this guards: raw .getHours() on the 2 AM
    // end reads smaller than 23.5, so cursor never advances past the event's
    // start and the loop wrongly reports the day free all the way to 12 AM.
    const events = [
      makeEvent(1, '2026-07-18T20:00:00', '2026-07-18T21:00:00'),
      makeEvent(2, '2026-07-18T23:30:00', '2026-07-19T02:00:00'),
    ];
    const slots = computeFreeSlots(events, new Date('2026-07-18T00:00:00'));

    const trailingSlot = slots[slots.length - 1]!;
    expect(trailingSlot).toEqual({ startHour: 21, endHour: 23.5 });
  });

  it('reports no free time after a midnight-spanning event that runs to the end of the day', () => {
    expect.assertions(1);
    const events = [makeEvent(1, '2026-07-18T23:30:00', '2026-07-19T02:00:00')];
    const slots = computeFreeSlots(events, new Date('2026-07-18T00:00:00'));

    expect(slots.some((s) => s.endHour === 24)).toBe(false);
  });

  it('still computes ordinary same-day gaps correctly', () => {
    expect.assertions(1);
    const events = [makeEvent(1, '2026-07-18T09:00:00', '2026-07-18T10:00:00')];
    const slots = computeFreeSlots(events, new Date('2026-07-18T00:00:00'));

    expect(slots).toEqual([
      { startHour: 1, endHour: 9 },
      { startHour: 10, endHour: 24 },
    ]);
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

describe('isSameMonth', () => {
  it('returns true for two dates in the same month and year', () => {
    expect.assertions(1);
    expect(
      isSameMonth(new Date('2026-03-01T00:00:00'), new Date('2026-03-28T23:00:00')),
    ).toBe(true);
  });

  it('returns false for dates in different months', () => {
    expect.assertions(1);
    expect(
      isSameMonth(new Date('2026-03-31T00:00:00'), new Date('2026-04-01T00:00:00')),
    ).toBe(false);
  });

  it('returns false for the same month/day in different years', () => {
    expect.assertions(1);
    expect(
      isSameMonth(new Date('2025-03-15T00:00:00'), new Date('2026-03-15T00:00:00')),
    ).toBe(false);
  });
});

describe('getMonthGridDays', () => {
  it('returns exactly 42 days (a 6x7 grid)', () => {
    expect.assertions(1);
    expect(getMonthGridDays(new Date('2026-03-15T00:00:00'))).toHaveLength(42);
  });

  it('starts the grid on the Monday on/before the 1st of the month', () => {
    expect.assertions(2);
    // March 2026: the 1st is a Sunday, so the grid should start Mon 23 Feb.
    const days = getMonthGridDays(new Date('2026-03-15T00:00:00'));
    expect(days[0]!.getDay()).toBe(1); // Monday
    expect(days[0]!.toDateString()).toBe(new Date('2026-02-23T00:00:00').toDateString());
  });

  it('includes leading and trailing days from adjacent months', () => {
    expect.assertions(2);
    const monthAnchor = new Date('2026-03-15T00:00:00');
    const days = getMonthGridDays(monthAnchor);
    expect(isSameMonth(days[0]!, monthAnchor)).toBe(false);
    expect(isSameMonth(days[days.length - 1]!, monthAnchor)).toBe(false);
  });

  it('covers every day of the anchor month', () => {
    expect.assertions(31);
    const monthAnchor = new Date('2026-03-01T00:00:00');
    const days = getMonthGridDays(monthAnchor);
    const monthDays = days.filter((d) => isSameMonth(d, monthAnchor));
    for (let i = 0; i < 31; i++) {
      expect(monthDays[i]!.getDate()).toBe(i + 1);
    }
  });
});

describe('locale-aware formatting (uk)', () => {
  it('formatMonthYear renders the Ukrainian month name', () => {
    expect.assertions(1);
    expect(formatMonthYear(new Date(dates.julySample), locales.ukrainian)).toBe(texts.ukrainianMonthYear);
  });

  it('formatFullDate renders the Ukrainian weekday and month', () => {
    expect.assertions(1);
    expect(formatFullDate(new Date(dates.julySample), locales.ukrainian)).toBe(texts.ukrainianFullDate);
  });

  it('getGreeting picks up the current i18next language', async () => {
    expect.assertions(1);
    await i18next.changeLanguage(locales.ukrainian);
    expect(getGreeting(new Date(dates.julyMorning))).toBe(texts.ukrainianMorningGreeting);
  });

  it('formatRelativeTimeAgo pluralises correctly for 1/2/5 minutes in Ukrainian', async () => {
    expect.assertions(3);
    await i18next.changeLanguage(locales.ukrainian);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dates.marchNow));
    expect(formatRelativeTimeAgo(dates.marchOneMinuteAgo)).toBe(texts.ukrainianOneMinuteAgo);
    expect(formatRelativeTimeAgo(dates.marchTwoMinutesAgo)).toBe(texts.ukrainianTwoMinutesAgo);
    expect(formatRelativeTimeAgo(dates.marchFiveMinutesAgo)).toBe(texts.ukrainianFiveMinutesAgo);
  });

  it('formatRelativeTimeAgo renders "Just now"/"Yesterday" in Ukrainian', async () => {
    expect.assertions(2);
    await i18next.changeLanguage(locales.ukrainian);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dates.marchJustNow));
    expect(formatRelativeTimeAgo(dates.marchMorning)).toBe(texts.ukrainianJustNow);
    vi.setSystemTime(new Date(dates.marchMorning));
    expect(formatRelativeTimeAgo(dates.marchYesterday)).toBe(texts.ukrainianYesterday);
  });

  it('formatTaskDueDate renders Ukrainian "Done"/"No due date"/"Today"', async () => {
    expect.assertions(3);
    await i18next.changeLanguage(locales.ukrainian);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dates.marchMorningUtc));
    expect(formatTaskDueDate(dates.completedTask, statuses.done).label).toBe(texts.ukrainianDone);
    expect(formatTaskDueDate(null, statuses.todo).label).toBe(texts.ukrainianNoDueDate);
    expect(formatTaskDueDate(dates.todayTaskDueDate, statuses.todo).label).toBe(texts.ukrainianToday);
  });

  it('formatFreeSlotRange renders "Сьогодні"/"Завтра" in Ukrainian', async () => {
    expect.assertions(2);
    await i18next.changeLanguage(locales.ukrainian);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dates.marchMorning));
    expect(formatFreeSlotRange(dates.freeSlotStart, dates.freeSlotEnd)).toBe(texts.ukrainianTodayFreeSlot);
    expect(formatFreeSlotRange(dates.tomorrowFreeSlotStart, dates.tomorrowFreeSlotEnd)).toBe(texts.ukrainianTomorrowFreeSlot);
  });

  it('formatRelativeEventTime renders "Сьогодні"/"Завтра" in Ukrainian', async () => {
    expect.assertions(2);
    await i18next.changeLanguage(locales.ukrainian);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dates.marchMorning));
    expect(formatRelativeEventTime(dates.todayEvent)).toBe(texts.ukrainianTodayRelativeEvent);
    expect(formatRelativeEventTime(dates.tomorrowEvent)).toBe(texts.ukrainianTomorrowRelativeEvent);
  });

  it('an explicit locale argument overrides the current i18next language', () => {
    expect.assertions(1);
    expect(formatMonthYear(new Date(dates.julySample), locales.english)).toBe(texts.englishMonthYear);
  });
});
