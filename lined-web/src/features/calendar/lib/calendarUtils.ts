import i18next from 'i18next';
import type { EventDto } from '@/features/calendar/model';
import type { TaskStatus } from '@/features/tasks/model';

export type CalendarLocale = 'en' | 'uk';

/** Resolves the app's current i18n language, re-read on every call so a
 * locale switch is picked up without callers needing to pass it explicitly. */
const currentLocale = (): CalendarLocale => (i18next.language === 'uk' ? 'uk' : 'en');

const localeTag = (locale: CalendarLocale, enBase: 'en-US' | 'en-GB'): string =>
  locale === 'uk' ? 'uk-UA' : enBase;

export const GRID_START_HOUR = 1; // 1 AM
export const GRID_END_HOUR = 24; // 12 AM (midnight)
export const HOUR_HEIGHT = 80; // px per hour

export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => i + GRID_START_HOUR,
); // [1, 2, 3, ..., 23]

export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const getDayBounds = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
}

export const isSameMonth = (a: Date, b: Date): boolean => {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export const getMonthStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export const getMonthGridDays = (monthAnchor: Date): Date[] => {
  const monthStart = getMonthStart(monthAnchor);
  const gridStart = getWeekStart(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export const formatMonthYear = (date: Date, locale: CalendarLocale = currentLocale()): string => {
  return date.toLocaleDateString(localeTag(locale, 'en-US'), { month: 'long', year: 'numeric' });
}

export const formatDayLabel = (date: Date, locale: CalendarLocale = currentLocale()): string => {
  const weekday = date.toLocaleDateString(localeTag(locale, 'en-US'), { weekday: 'short' });
  return `${weekday} ${date.getDate()}`;
}

const toHourClock = (hour: number): { value: string; ampm: 'AM' | 'PM' } => {
  const wholeHour = Math.floor(hour);
  const ampm = wholeHour >= 12 ? 'PM' : 'AM';
  const h = wholeHour % 12 || 12;
  const minutes = Math.round((hour - wholeHour) * 60);
  const value = minutes === 0 ? `${h}` : `${h}:${minutes.toString().padStart(2, '0')}`;
  return { value, ampm };
}

export const formatHour = (hour: number): string => {
  const { value, ampm } = toHourClock(hour);
  return `${value} ${ampm}`;
}

export const formatClockTime = (d: Date): string => {
  const { value, ampm } = toHourClock(d.getHours() + d.getMinutes() / 60);
  return `${value} ${ampm}`;
}

export const formatEventTime = (startAt: string, endAt: string, locale: CalendarLocale = currentLocale()): string => {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const dateStr = start.toLocaleDateString(localeTag(locale, 'en-US'), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return `${dateStr} · ${formatClockTime(start)} – ${formatClockTime(end)}`;
}

export const getGreeting = (date: Date = new Date()): string => {
  const hour = date.getHours();
  const key = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return i18next.t(`common:greeting.${key}`);
}

export const formatFullDate = (date: Date, locale: CalendarLocale = currentLocale()): string => {
  return date.toLocaleDateString(localeTag(locale, 'en-GB'), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const formatRelativeEventTime = (startAt: string, locale: CalendarLocale = currentLocale()): string => {
  const start = new Date(startAt);
  const now = new Date();
  const timeStr = formatClockTime(start);

  if (isSameDay(start, now)) return `${i18next.t('common:dates.today')} · ${timeStr}`;
  if (isSameDay(start, addDays(now, 1))) return `${i18next.t('common:dates.tomorrow')} · ${timeStr}`;

  const weekday = start.toLocaleDateString(localeTag(locale, 'en-US'), { weekday: 'short' });
  const dayMonth = start.toLocaleDateString(localeTag(locale, 'en-GB'), {
    day: 'numeric',
    month: 'short',
  });
  return `${weekday}, ${dayMonth} · ${timeStr}`;
}

export const formatShortDate = (date: Date, locale: CalendarLocale = currentLocale()): string => {
  return date.toLocaleDateString(localeTag(locale, 'en-GB'), { day: 'numeric', month: 'short' });
}

export const formatRelativeTimeAgo = (iso: string): string => {
  const then = new Date(iso);
  const now = new Date();
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));

  if (seconds < 60) return i18next.t('common:relativeTime.justNow');

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return i18next.t('common:relativeTime.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18next.t('common:relativeTime.hoursAgo', { count: hours });

  if (isSameDay(then, addDays(now, -1))) return i18next.t('common:relativeTime.yesterday');

  const days = Math.floor(hours / 24);
  if (days < 7) return i18next.t('common:relativeTime.daysAgo', { count: days });

  return formatShortDate(then);
}

export const formatFreeSlotRange = (start: string, end: string, locale: CalendarLocale = currentLocale()): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();

  const dayLabel = isSameDay(startDate, now)
    ? i18next.t('common:dates.today')
    : isSameDay(startDate, addDays(now, 1))
      ? i18next.t('common:dates.tomorrow')
      : startDate.toLocaleDateString(localeTag(locale, 'en-US'), { weekday: 'long' });

  const startClock = toHourClock(startDate.getHours() + startDate.getMinutes() / 60);
  const endClock = toHourClock(endDate.getHours() + endDate.getMinutes() / 60);

  const range =
    startClock.ampm === endClock.ampm
      ? `${startClock.value}–${endClock.value} ${endClock.ampm}`
      : `${startClock.value} ${startClock.ampm}–${endClock.value} ${endClock.ampm}`;

  return `${dayLabel} ${range}`;
}

export const formatTaskDueDate = (
  dueDate: string | null,
  status: TaskStatus,
  locale: CalendarLocale = currentLocale(),
): { label: string; isUrgent: boolean } => {
  if (status === 'DONE') return { label: i18next.t('common:dates.done'), isUrgent: false };
  if (!dueDate) return { label: i18next.t('common:dates.noDueDate'), isUrgent: false };

  const dueStr = dueDate.slice(0, 10);
  const todayStr = toLocalDateString(new Date());

  if (dueStr === todayStr) return { label: i18next.t('common:dates.today'), isUrgent: true };

  const due = new Date(`${dueStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  const isOverdue = due.getTime() < today.getTime();

  const label = due.toLocaleDateString(localeTag(locale, 'en-US'), {
    month: 'short',
    day: 'numeric',
  });

  return { label, isUrgent: isOverdue };
}

export const getEventTop = (startAt: string): number => {
  const d = new Date(startAt);
  const hours = d.getHours() + d.getMinutes() / 60;
  return (hours - GRID_START_HOUR) * HOUR_HEIGHT;
}

export const getEventHeight = (startAt: string, endAt: string): number => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return durationHours * HOUR_HEIGHT;
}

export const eventTouchesDay = (event: EventDto, day: Date): boolean => {
  const { start: dayStart, end: dayEnd } = getDayBounds(day);
  const eventStart = new Date(event.startAt);
  const eventEnd = new Date(event.endAt);
  return eventStart < dayEnd && eventEnd > dayStart;
}

export const clipEventToDay = (event: EventDto, day: Date): { startAt: string; endAt: string } => {
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

export const computeFreeSlots = (events: EventDto[], day: Date): FreeSlot[] => {
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

export const formatHourRange = (startHour: number, endHour: number): string => {
  const start = toHourClock(startHour);
  const end = toHourClock(endHour);

  return start.ampm === end.ampm
    ? `${start.value}–${end.value} ${end.ampm}`
    : `${start.value} ${start.ampm}–${end.value} ${end.ampm}`;
}

export const hourRangeToIso = (day: Date, startHour: number, endHour: number): { start: string; end: string } => {
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

export const assignEventLanes = (events: EventDto[]): Map<number, EventLane> => {
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

export const toDatetimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const fromDatetimeLocal = (value: string): Date => {
  return new Date(value);
}
