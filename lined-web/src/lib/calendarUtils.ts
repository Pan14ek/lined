import type { EventDto, TaskStatus } from '@/types';

export const GRID_START_HOUR = 1; // 1 AM
export const GRID_END_HOUR = 24; // 12 AM (midnight)
export const HOUR_HEIGHT = 80; // px per hour

export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => i + GRID_START_HOUR,
); // [1, 2, 3, ..., 23]

/** Returns the Monday of the week containing `date`. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Midnight-to-midnight bounds of the day containing `date`. */
export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** `YYYY-MM-DD` for `date` in the viewer's local timezone (not UTC). */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** First-of-month for the month containing `date`. */
export function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

/**
 * The 42 (6×7) Monday-start days spanning the full weeks that contain
 * `monthAnchor`'s month, including leading/trailing days from adjacent
 * months.
 */
export function getMonthGridDays(monthAnchor: Date): Date[] {
  const monthStart = getMonthStart(monthAnchor);
  const gridStart = getWeekStart(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** "April 2026" */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** "Mon 13" */
export function formatDayLabel(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday} ${date.getDate()}`;
}

/** "9 AM", "12 PM", "2 PM" */
export function formatHour(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

/** "9:00 AM", "12 PM", "2:30 PM" */
export function formatClockTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0
    ? `${hour} ${ampm}`
    : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/** "Mon 13 Apr · 9:00 – 10:00 AM" */
export function formatEventTime(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const dateStr = start.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return `${dateStr} · ${formatClockTime(start)} – ${formatClockTime(end)}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" based on the hour. */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Saturday, 28 March 2026" */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "Today · 5:00 PM", "Tomorrow · 7:00 PM", "Sun, 29 Mar · 7:00 PM" */
export function formatRelativeEventTime(startAt: string): string {
  const start = new Date(startAt);
  const now = new Date();
  const timeStr = formatClockTime(start);

  if (isSameDay(start, now)) return `Today · ${timeStr}`;
  if (isSameDay(start, addDays(now, 1))) return `Tomorrow · ${timeStr}`;

  const weekday = start.toLocaleDateString('en-US', { weekday: 'short' });
  const dayMonth = start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${weekday}, ${dayMonth} · ${timeStr}`;
}

/** "Today 2–5 PM", "Tomorrow 2–5 PM", "Sunday 2–5 PM" */
export function formatFreeSlotRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();

  const dayLabel = isSameDay(startDate, now)
    ? 'Today'
    : isSameDay(startDate, addDays(now, 1))
      ? 'Tomorrow'
      : startDate.toLocaleDateString('en-US', { weekday: 'long' });

  const formatHour = (d: Date): string => {
    const h = d.getHours();
    const m = d.getMinutes();
    const hour = h % 12 || 12;
    return m === 0 ? `${hour}` : `${hour}:${m.toString().padStart(2, '0')}`;
  };

  const startAmPm = startDate.getHours() >= 12 ? 'PM' : 'AM';
  const endAmPm = endDate.getHours() >= 12 ? 'PM' : 'AM';

  const range =
    startAmPm === endAmPm
      ? `${formatHour(startDate)}–${formatHour(endDate)} ${endAmPm}`
      : `${formatHour(startDate)} ${startAmPm}–${formatHour(endDate)} ${endAmPm}`;

  return `${dayLabel} ${range}`;
}

/** Due-date label + urgency flag for a task row ("Today"/overdue are urgent). */
export function formatTaskDueDate(
  dueDate: string | null,
  status: TaskStatus,
): { label: string; isUrgent: boolean } {
  if (status === 'DONE') return { label: 'Done', isUrgent: false };
  if (!dueDate) return { label: 'No due date', isUrgent: false };

  const dueStr = dueDate.slice(0, 10);
  const todayStr = toLocalDateString(new Date());

  if (dueStr === todayStr) return { label: 'Today', isUrgent: true };

  const due = new Date(`${dueStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  const isOverdue = due.getTime() < today.getTime();

  const label = due.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return { label, isUrgent: isOverdue };
}

/** Pixel offset from the top of the time grid. */
export function getEventTop(startAt: string): number {
  const d = new Date(startAt);
  const hours = d.getHours() + d.getMinutes() / 60;
  return (hours - GRID_START_HOUR) * HOUR_HEIGHT;
}

/** Pixel height of the event block. */
export function getEventHeight(startAt: string, endAt: string): number {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return durationHours * HOUR_HEIGHT;
}

/** True if an event starts, ends, or spans across the given day. */
export function eventTouchesDay(event: EventDto, day: Date): boolean {
  const { start: dayStart, end: dayEnd } = getDayBounds(day);
  const eventStart = new Date(event.startAt);
  const eventEnd = new Date(event.endAt);
  return eventStart < dayEnd && eventEnd > dayStart;
}

/**
 * Clips an event's start/end to `day`'s midnight-to-midnight bounds, so a
 * multi-day event (e.g. 11:30 PM–2 AM) renders as two separate segments: a
 * short block at the bottom of the day it starts, and a continuation at the
 * top of the day it ends. The portion before GRID_START_HOUR on the
 * continuation day is clipped by the grid itself, same as free slots.
 */
export function clipEventToDay(
  event: EventDto,
  day: Date,
): { startAt: string; endAt: string } {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);

  const eventStart = new Date(event.startAt);
  const eventEnd = new Date(event.endAt);

  const start = eventStart < dayStart ? dayStart : eventStart;
  const end = eventEnd > dayEnd ? dayEnd : eventEnd;

  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export interface FreeSlot {
  startHour: number;
  endHour: number;
}

/**
 * Compute gaps between events within the visible grid range (>= 30 min), for
 * one specific day. Events are clipped to that day first — a plain
 * `.getHours()` read on a midnight-spanning event's real endAt (e.g. 2 AM the
 * next day) would come back smaller than its own start hour, making the gap
 * logic below think the day was free again right after the event started.
 */
export function computeFreeSlots(events: EventDto[], day: Date): FreeSlot[] {
  if (events.length === 0) return [];

  const MIN_SLOT_HOURS = 0.5;

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  // Hours elapsed since this day's midnight, rather than getHours(), so a
  // clipped end exactly at the next day's midnight reads as 24, not 0.
  const hoursSinceMidnight = (d: Date): number =>
    (d.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

  const ranges = events
    .map((e) => clipEventToDay(e, day))
    .map(({ startAt, endAt }) => ({
      start: hoursSinceMidnight(new Date(startAt)),
      end: hoursSinceMidnight(new Date(endAt)),
    }))
    .sort((a, b) => a.start - b.start);

  const freeSlots: FreeSlot[] = [];
  let cursor = GRID_START_HOUR;

  for (const range of ranges) {
    if (range.start > cursor + MIN_SLOT_HOURS) {
      freeSlots.push({ startHour: cursor, endHour: range.start });
    }
    cursor = Math.max(cursor, range.end);
  }

  if (cursor < GRID_END_HOUR - MIN_SLOT_HOURS) {
    freeSlots.push({ startHour: cursor, endHour: GRID_END_HOUR });
  }

  return freeSlots;
}

/** "2–5 PM", "9 AM–12 PM" for a grid-relative hour range. */
export function formatHourRange(startHour: number, endHour: number): string {
  const formatHourAmPm = (hour: number): { value: string; ampm: 'AM' | 'PM' } => {
    const wholeHour = Math.floor(hour);
    const ampm = wholeHour >= 12 ? 'PM' : 'AM';
    const h = wholeHour % 12 || 12;
    const minutes = Math.round((hour - wholeHour) * 60);
    const value = minutes === 0 ? `${h}` : `${h}:${minutes.toString().padStart(2, '0')}`;
    return { value, ampm };
  };

  const start = formatHourAmPm(startHour);
  const end = formatHourAmPm(endHour);

  return start.ampm === end.ampm
    ? `${start.value}–${end.value} ${end.ampm}`
    : `${start.value} ${start.ampm}–${end.value} ${end.ampm}`;
}

/** Converts a grid-relative hour range on a given day into real ISO timestamps. */
export function hourRangeToIso(
  day: Date,
  startHour: number,
  endHour: number,
): { start: string; end: string } {
  const toDate = (hour: number): Date => {
    const d = new Date(day);
    const wholeHour = Math.floor(hour);
    const minutes = Math.round((hour - wholeHour) * 60);
    d.setHours(wholeHour, minutes, 0, 0);
    return d;
  };

  return { start: toDate(startHour).toISOString(), end: toDate(endHour).toISOString() };
}

export interface EventLane {
  lane: number;
  laneCount: number;
}

/**
 * Greedy sweep-line layout: assigns each event to the first lane whose
 * previous occupant has already ended, opening a new lane otherwise. Events
 * that overlap in time end up in the same "cluster" and share its lane count.
 */
export function assignEventLanes(events: EventDto[]): Map<number, EventLane> {
  const result = new Map<number, EventLane>();
  if (events.length === 0) return result;

  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  let clusterEventIds: number[] = [];
  let clusterLaneCount = 0;
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    for (const id of clusterEventIds) {
      const lane = result.get(id)?.lane ?? 0;
      result.set(id, { lane, laneCount: clusterLaneCount });
    }
  };

  const laneEnds: number[] = [];

  for (const event of sorted) {
    const start = new Date(event.startAt).getTime();
    const end = new Date(event.endAt).getTime();

    if (start >= clusterEnd) {
      flushCluster();
      clusterEventIds = [];
      clusterLaneCount = 0;
      laneEnds.length = 0;
      clusterEnd = -Infinity;
    }

    let lane = laneEnds.findIndex((laneEndTime) => laneEndTime <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }

    result.set(event.id, { lane, laneCount: 1 });
    clusterEventIds.push(event.id);
    clusterLaneCount = laneEnds.length;
    clusterEnd = Math.max(clusterEnd, end);
  }

  flushCluster();

  return result;
}

/** Format a Date as "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a "YYYY-MM-DDTHH:mm" string into a local Date. */
export function fromDatetimeLocal(value: string): Date {
  return new Date(value);
}
