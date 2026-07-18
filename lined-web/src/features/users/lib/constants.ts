export const QUERY_KEYS = {
  users: ['users'] as const,
  user: (id: number) => ['users', id] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
} as const;
