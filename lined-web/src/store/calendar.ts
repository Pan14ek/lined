import { create } from 'zustand';
import { getWeekStart, getMonthStart, addDays } from '@/features/calendar/lib/calendarUtils';

export type ViewMode = 'week' | 'month';

interface CalendarState {
  weekStart: Date;
  monthAnchor: Date;
  viewMode: ViewMode;
  selectedEventId: number | null;
  isCreateModalOpen: boolean;
  /** Lobby ids excluded from the global calendar grid — mirrors Google/Outlook's
   *  per-calendar visibility checkboxes, so a busy user can declutter overlap. */
  hiddenLobbyIds: number[];
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  goToWeekOf: (day: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedEventId: (id: number | null) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  toggleLobbyVisibility: (lobbyId: number) => void;
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  weekStart: getWeekStart(),
  monthAnchor: getMonthStart(new Date()),
  viewMode: 'week',
  selectedEventId: null,
  isCreateModalOpen: false,
  hiddenLobbyIds: [],

  goToPrevWeek: () => set((s) => ({ weekStart: addDays(s.weekStart, -7) })),
  goToNextWeek: () => set((s) => ({ weekStart: addDays(s.weekStart, 7) })),
  goToPrevMonth: () =>
    set((s) => ({ monthAnchor: getMonthStart(addDays(s.monthAnchor, -1)) })),
  goToNextMonth: () =>
    set((s) => ({ monthAnchor: getMonthStart(addDays(s.monthAnchor, 32)) })),
  goToToday: () => set({ weekStart: getWeekStart(), monthAnchor: getMonthStart(new Date()) }),
  goToWeekOf: (day) => set({ weekStart: getWeekStart(day), viewMode: 'week' }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  toggleLobbyVisibility: (lobbyId) =>
    set((s) => ({
      hiddenLobbyIds: s.hiddenLobbyIds.includes(lobbyId)
        ? s.hiddenLobbyIds.filter((id) => id !== lobbyId)
        : [...s.hiddenLobbyIds, lobbyId],
    })),
}));
