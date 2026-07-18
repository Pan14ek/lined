import { describe, it, expect } from 'vitest';
import type { FreeSlotDto } from '@/features/lobby/model';
import { freeSlotsForDay } from '../freeSlots';

const DAY = new Date('2026-03-28T00:00:00');
const OTHER_DAY = new Date('2026-03-29T00:00:00');

describe('freeSlotsForDay', () => {
  it('returns an empty array for no slots', () => {
    expect.assertions(1);
    expect(freeSlotsForDay([], DAY)).toEqual([]);
  });

  it('converts a same-day slot to grid-relative hours', () => {
    expect.assertions(1);
    const slots: FreeSlotDto[] = [
      { start: '2026-03-28T14:00:00', end: '2026-03-28T17:00:00' },
    ];
    expect(freeSlotsForDay(slots, DAY)).toEqual([{ startHour: 14, endHour: 17 }]);
  });

  it('skips a slot that does not touch the given day', () => {
    expect.assertions(1);
    const slots: FreeSlotDto[] = [
      { start: '2026-03-28T14:00:00', end: '2026-03-28T17:00:00' },
    ];
    expect(freeSlotsForDay(slots, OTHER_DAY)).toEqual([]);
  });

  it('clips a slot to the grid start/end bounds', () => {
    expect.assertions(1);
    // Starts just after midnight (before GRID_START_HOUR) and spills into the
    // next day (past GRID_END_HOUR, which same-day hours can never exceed).
    const slots: FreeSlotDto[] = [
      { start: '2026-03-28T00:30:00', end: '2026-03-29T02:00:00' },
    ];
    expect(freeSlotsForDay(slots, DAY)).toEqual([{ startHour: 1, endHour: 24 }]);
  });

  it('reports a full-day slot for a day strictly between the slot start/end days', () => {
    expect.assertions(1);
    const slots: FreeSlotDto[] = [
      { start: '2026-03-27T10:00:00', end: '2026-03-30T10:00:00' },
    ];
    expect(freeSlotsForDay(slots, DAY)).toEqual([{ startHour: 1, endHour: 24 }]);
  });

  it('handles multiple slots in the same day', () => {
    expect.assertions(1);
    const slots: FreeSlotDto[] = [
      { start: '2026-03-28T09:00:00', end: '2026-03-28T10:00:00' },
      { start: '2026-03-28T15:00:00', end: '2026-03-28T16:00:00' },
    ];
    expect(freeSlotsForDay(slots, DAY)).toEqual([
      { startHour: 9, endHour: 10 },
      { startHour: 15, endHour: 16 },
    ]);
  });
});
