import { describe, it, expect } from 'vitest';
import { KANBAN_TEST_IDS, KANBAN_LABELS } from '../kanbanConstants';

describe('KANBAN_TEST_IDS', () => {
  it('builds a distinct test id per column status', () => {
    expect.assertions(2);
    expect(KANBAN_TEST_IDS.column('TODO')).toBe('kanban-column-TODO');
    expect(KANBAN_TEST_IDS.column('TODO')).not.toBe(KANBAN_TEST_IDS.column('DONE'));
  });

  it('builds a distinct test id per task card', () => {
    expect.assertions(1);
    expect(KANBAN_TEST_IDS.card(1)).not.toBe(KANBAN_TEST_IDS.card(2));
  });
});

describe('KANBAN_LABELS', () => {
  it('interpolates the task title into move/delete labels', () => {
    expect.assertions(3);
    expect(KANBAN_LABELS.moveBack('Buy milk')).toBe('Move "Buy milk" back');
    expect(KANBAN_LABELS.moveForward('Buy milk')).toBe('Move "Buy milk" forward');
    expect(KANBAN_LABELS.deleteTask('Buy milk')).toBe('Delete "Buy milk"');
  });

  it('interpolates the column label into the add-task label', () => {
    expect.assertions(1);
    expect(KANBAN_LABELS.addTaskToColumn('In Progress')).toBe('Add task to In Progress');
  });

  it('produces an empty-title label without throwing', () => {
    expect.assertions(1);
    expect(KANBAN_LABELS.deleteTask('')).toBe('Delete ""');
  });
});
