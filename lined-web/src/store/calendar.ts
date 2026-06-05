import { create } from 'zustand';
import { getWeekStart, addDays } from '@/lib/calendarUtils';

export type ViewMode = 'week' | 'month';

interface CalendarState {
  weekStart: Date;
  viewMode: ViewMode;
  selectedEventId: number | null;
  isCreateModalOpen: boolean;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedEventId: (id: number | null) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  weekStart: getWeekStart(),
  viewMode: 'week',
  selectedEventId: null,
  isCreateModalOpen: false,

  goToPrevWeek: () => set((s) => ({ weekStart: addDays(s.weekStart, -7) })),
  goToNextWeek: () => set((s) => ({ weekStart: addDays(s.weekStart, 7) })),
  goToToday: () => set({ weekStart: getWeekStart() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}));
