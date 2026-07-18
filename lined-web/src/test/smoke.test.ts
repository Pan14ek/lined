import { describe, it, expect } from 'vitest';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { MOCK_TASKS } from '@/features/tasks/api/mockData';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';

describe('Mock data', () => {
  it('has users matching mockup personas, including invitable non-members', () => {
    expect(MOCK_USERS).toHaveLength(8);
    expect(MOCK_USERS[0]?.username).toBe('alex_johnson');
    expect(MOCK_USERS[1]?.username).toBe('nastia_k');
  });

  it('has lobbies covering each type', () => {
    expect(MOCK_LOBBIES).toHaveLength(4);
    const types = MOCK_LOBBIES.map((l) => l.lobbyType);
    expect(types).toContain('COUPLE');
    expect(types).toContain('FAMILY');
    expect(types).toContain('FRIENDS');
    expect(types).toContain('WORK');
  });

  it('has tasks with valid statuses', () => {
    expect(MOCK_TASKS.length).toBeGreaterThan(0);
    const validStatuses = new Set(['TODO', 'IN_PROGRESS', 'DONE']);
    MOCK_TASKS.forEach((t) => expect(validStatuses.has(t.status)).toBe(true));
  });

  it('has events with valid date strings', () => {
    expect(MOCK_EVENTS.length).toBeGreaterThan(0);
    MOCK_EVENTS.forEach((e) => {
      expect(() => new Date(e.startAt)).not.toThrow();
      expect(() => new Date(e.endAt)).not.toThrow();
    });
  });
});
