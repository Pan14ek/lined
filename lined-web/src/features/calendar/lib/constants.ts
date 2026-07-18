export interface LegendItem {
  label: string;
  color: string;
}

export const DEFAULT_LEGEND_ITEMS: LegendItem[] = [
  { label: 'Couple', color: 'var(--color-lobby-couple)' },
  { label: 'Family', color: 'var(--color-lobby-family)' },
  { label: 'Friends', color: 'var(--color-lobby-friends)' },
  { label: 'Work', color: 'var(--color-lobby-work)' },
  { label: 'Free slot', color: 'var(--color-free-slot)' },
];

export const QUERY_KEYS = {
  events: ['events'] as const,
  eventConflicts: (lobbyId: number, start: string, end: string) =>
    ['calendar', 'conflicts', lobbyId, start, end] as const,
} as const;
