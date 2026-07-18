import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto } from '@/features/tasks/model';
import { KanbanColumn, type KanbanActions, type KanbanMoveState } from '../KanbanColumn';
import { KANBAN_LABELS, KANBAN_TEXT } from '../kanbanConstants';

const lobby: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const task: TaskDto = {
  id: 1,
  title: 'Plan dinner for Saturday',
  description: null,
  priority: 'HIGH',
  status: 'TODO',
  lobbyId: 1,
  creatorId: 1,
  assigneeId: null,
  dueDate: null,
  createdAt: '2026-04-09T08:00:00Z',
};

const moveState: KanbanMoveState = { movingTaskId: null, moveErrors: {} };

const makeActions = (): KanbanActions => ({
  onMove: vi.fn(),
  onDelete: vi.fn(),
  onOpen: vi.fn(),
  onQuickAdd: vi.fn(),
  onDropTask: vi.fn(),
});

describe('KanbanColumn', () => {
  it('renders its tasks', () => {
    expect.assertions(1);
    renderWithProviders(
      <KanbanColumn
        status="TODO"
        tasks={[task]}
        lobbiesById={new Map([[lobby.id, lobby]])}
        assigneesById={new Map()}
        moveState={moveState}
        actions={makeActions()}
      />,
    );

    expect(screen.getByText('Plan dinner for Saturday')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no tasks in the column', () => {
    expect.assertions(1);
    renderWithProviders(
      <KanbanColumn
        status="DONE"
        tasks={[]}
        lobbiesById={new Map()}
        assigneesById={new Map()}
        moveState={moveState}
        actions={makeActions()}
      />,
    );

    expect(screen.getByText('No tasks in Done.')).toBeInTheDocument();
  });

  it('calls onQuickAdd with the column status from the "+" button', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(
      <KanbanColumn
        status="IN_PROGRESS"
        tasks={[]}
        lobbiesById={new Map()}
        assigneesById={new Map()}
        moveState={moveState}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole('button', { name: KANBAN_LABELS.addTaskToColumn('In Progress') }));

    expect(actions.onQuickAdd).toHaveBeenCalledWith('IN_PROGRESS');
  });

  it('calls onQuickAdd from the bottom "Add task" button too', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(
      <KanbanColumn
        status="TODO"
        tasks={[]}
        lobbiesById={new Map()}
        assigneesById={new Map()}
        moveState={moveState}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole('button', { name: KANBAN_TEXT.addTask }));

    expect(actions.onQuickAdd).toHaveBeenCalledWith('TODO');
  });
});
