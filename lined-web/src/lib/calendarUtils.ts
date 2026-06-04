import type { EventDto } from '@/types';

export const GRID_START_HOUR = 8; // 8 AM
export const GRID_END_HOUR = 22; // 10 PM
export const HOUR_HEIGHT = 80; // px per hour

export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => i + GRID_START_HOUR,
); // [8, 9, 10, ..., 21]

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

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
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

/** "Mon 13 Apr · 9:00 – 10:00 AM" */
export function formatEventTime(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const dateStr = start.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const formatTime = (d: Date): string => {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0
      ? `${hour} ${ampm}`
      : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return `${dateStr} · ${formatTime(start)} – ${formatTime(end)}`;
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

export interface FreeSlot {
  startHour: number;
  endHour: number;
}

/** Compute gaps between events within the visible grid range (≥ 30 min). */
export function computeFreeSlots(events: EventDto[]): FreeSlot[] {
  if (events.length === 0) return [];

  const MIN_SLOT_HOURS = 0.5;

  const ranges = events
    .map((e) => ({
      start:
        new Date(e.startAt).getHours() + new Date(e.startAt).getMinutes() / 60,
      end:
        new Date(e.endAt).getHours() + new Date(e.endAt).getMinutes() / 60,
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

/** Format a Date as "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a "YYYY-MM-DDTHH:mm" string into a local Date. */
export function fromDatetimeLocal(value: string): Date {
  return new Date(value);
}
