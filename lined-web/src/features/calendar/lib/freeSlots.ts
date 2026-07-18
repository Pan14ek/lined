import type { FreeSlotDto } from '@/features/lobby/model';
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  getDayBounds,
  isSameDay,
  type FreeSlot,
} from './calendarUtils';

const toHour = (d: Date): number => d.getHours() + d.getMinutes() / 60;

export const freeSlotsForDay = (slots: FreeSlotDto[], day: Date): FreeSlot[] => {
  const result: FreeSlot[] = [];

  for (const slot of slots) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const { start: dayStart, end: dayEnd } = getDayBounds(day);
    if (!(start < dayEnd && end > dayStart)) continue;

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
