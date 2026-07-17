import type { FreeSlotDto } from '@/types';
import { GRID_END_HOUR, GRID_START_HOUR, isSameDay, type FreeSlot } from './calendarUtils';

const toHour = (d: Date): number => d.getHours() + d.getMinutes() / 60;

/**
 * Converts server-side ISO-range free slots into grid-relative hour ranges
 * for a single calendar day, clipped to the visible grid bounds.
 */
export function freeSlotsForDay(slots: FreeSlotDto[], day: Date): FreeSlot[] {
  const result: FreeSlot[] = [];

  for (const slot of slots) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    if (!isSameDay(start, day) && !isSameDay(end, day)) continue;

    const startHour = isSameDay(start, day)
      ? Math.max(toHour(start), GRID_START_HOUR)
      : GRID_START_HOUR;
    const endHour = isSameDay(end, day)
      ? Math.min(toHour(end), GRID_END_HOUR)
      : GRID_END_HOUR;

    if (endHour > startHour) {
      result.push({ startHour, endHour });
    }
  }

  return result;
}
