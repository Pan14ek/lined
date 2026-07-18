import { describe, it, expect } from 'vitest';
import type { TaskDto, TaskStatus } from '@/features/tasks/model';
import {
  STATUS_ORDER,
  getAdjacentStatus,
  groupTasksByStatus,
  isTaskOverdue,
  isTaskDueThisWeek,
  filterTasks,
} from '../taskUtils';

const TODAY = new Date('2026-04-15T12:00:00'); // Wednesday

const makeTask = (overrides: Partial<TaskDto>): TaskDto => {
  return {
    id: 1,
    title: 'Task',
    description: null,
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 1,
    creatorId: 1,
    assigneeId: null,
    dueDate: null,
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

describe('getAdjacentStatus', () => {
  it.each<[TaskStatus, 'prev' | 'next', TaskStatus | undefined]>([
    ['TODO', 'next', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'next', 'DONE'],
    ['DONE', 'prev', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'prev', 'TODO'],
    ['TODO', 'prev', undefined],
    ['DONE', 'next', undefined],
  ])('getAdjacentStatus(%s, %s) → %s', (status, direction, expected) => {
    expect.assertions(1);
    expect(getAdjacentStatus(status, direction)).toBe(expected);
  });

  it('exposes STATUS_ORDER as TODO, IN_PROGRESS, DONE', () => {
    expect.assertions(1);
    expect(STATUS_ORDER).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
  });
});

describe('groupTasksByStatus', () => {
  it('groups tasks into their status buckets', () => {
    expect.assertions(3);
    const tasks = [
      makeTask({ id: 1, status: 'TODO' }),
      makeTask({ id: 2, status: 'IN_PROGRESS' }),
      makeTask({ id: 3, status: 'DONE' }),
      makeTask({ id: 4, status: 'TODO' }),
    ];

    const groups = groupTasksByStatus(tasks);

    expect(groups.TODO).toHaveLength(2);
    expect(groups.IN_PROGRESS).toHaveLength(1);
    expect(groups.DONE).toHaveLength(1);
  });

  it('returns empty arrays for every status when given no tasks', () => {
    expect.assertions(3);
    const groups = groupTasksByStatus([]);

    expect(groups.TODO).toEqual([]);
    expect(groups.IN_PROGRESS).toEqual([]);
    expect(groups.DONE).toEqual([]);
  });
});

describe('isTaskOverdue', () => {
  it('is true for a past due date on a non-done task', () => {
    expect.assertions(1);
    expect(isTaskOverdue(makeTask({ dueDate: '2026-04-10', status: 'TODO' }), TODAY)).toBe(true);
  });

  it('is false for a done task even if the due date is past', () => {
    expect.assertions(1);
    expect(isTaskOverdue(makeTask({ dueDate: '2026-04-10', status: 'DONE' }), TODAY)).toBe(false);
  });

  it('is false when there is no due date', () => {
    expect.assertions(1);
    expect(isTaskOverdue(makeTask({ dueDate: null }), TODAY)).toBe(false);
  });

  it('is false for today\'s due date', () => {
    expect.assertions(1);
    expect(isTaskOverdue(makeTask({ dueDate: '2026-04-15' }), TODAY)).toBe(false);
  });

  it('uses the local calendar day, not the UTC day, to decide "today"', () => {
    expect.assertions(1);
    // Local midnight-thirty on the 16th, which is still the 15th in UTC.
    const justAfterLocalMidnight = new Date('2026-04-16T00:30:00');
    expect(
      isTaskOverdue(makeTask({ dueDate: '2026-04-16' }), justAfterLocalMidnight),
    ).toBe(false);
  });
});

describe('isTaskDueThisWeek', () => {
  it('is true for a due date within the current Mon-Sun week', () => {
    expect.assertions(1);
    expect(isTaskDueThisWeek(makeTask({ dueDate: '2026-04-17' }), TODAY)).toBe(true);
  });

  it('is false for a due date next week', () => {
    expect.assertions(1);
    expect(isTaskDueThisWeek(makeTask({ dueDate: '2026-04-25' }), TODAY)).toBe(false);
  });

  it('is false when there is no due date', () => {
    expect.assertions(1);
    expect(isTaskDueThisWeek(makeTask({ dueDate: null }), TODAY)).toBe(false);
  });
});

describe('filterTasks', () => {
  const tasks = [
    makeTask({ id: 1, lobbyId: 1, assigneeId: 10, dueDate: '2026-04-10', status: 'TODO' }),
    makeTask({ id: 2, lobbyId: 2, assigneeId: 20, dueDate: '2026-04-17', status: 'IN_PROGRESS' }),
    makeTask({ id: 3, lobbyId: 1, assigneeId: 20, dueDate: null, status: 'DONE' }),
  ];

  it('returns every task when no filters are set', () => {
    expect.assertions(1);
    expect(filterTasks(tasks, {}, TODAY)).toHaveLength(3);
  });

  it('narrows by lobbyId', () => {
    expect.assertions(2);
    const result = filterTasks(tasks, { lobbyId: 1 }, TODAY);
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.lobbyId === 1)).toBe(true);
  });

  it('narrows by memberId', () => {
    expect.assertions(2);
    const result = filterTasks(tasks, { memberId: 20 }, TODAY);
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.assigneeId === 20)).toBe(true);
  });

  it('narrows to overdue tasks only', () => {
    expect.assertions(2);
    const result = filterTasks(tasks, { dateFilter: 'OVERDUE' }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  it('narrows to tasks due this week only', () => {
    expect.assertions(2);
    const result = filterTasks(tasks, { dateFilter: 'THIS_WEEK' }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(2);
  });

  it('combines lobby, member, and date filters', () => {
    expect.assertions(1);
    const result = filterTasks(tasks, { lobbyId: 1, memberId: 10, dateFilter: 'OVERDUE' }, TODAY);
    expect(result.map((t) => t.id)).toEqual([1]);
  });
});
