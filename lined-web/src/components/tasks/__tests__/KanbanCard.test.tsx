import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { LobbyDto, TaskDto, UserDto } from '@/types';
import { KanbanCard } from '../KanbanCard';
import { KANBAN_LABELS } from '../kanbanConstants';

const baseTask: TaskDto = {
  id: 1,
  title: 'Plan dinner for Saturday',
  description: null,
  priority: 'HIGH',
  status: 'TODO',
  lobbyId: 1,
  creatorId: 1,
  assigneeId: 1,
  dueDate: null,
  createdAt: '2026-04-09T08:00:00Z',
};

const lobby: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const assignee: UserDto = {
  id: 1,
  username: 'alex_johnson',
  email: 'alex@lined.app',
  createdAt: '2025-01-15T10:00:00Z',
  roles: ['ROLE_USER'],
  activePlan: null,
  activeUntil: null,
};

describe('KanbanCard', () => {
  it('renders the title and lobby badge', () => {
    expect.assertions(2);
    renderWithProviders(
      <KanbanCard
        task={baseTask}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(baseTask.title)).toBeInTheDocument();
    expect(screen.getByText(lobby.name)).toBeInTheDocument();
  });

  it('colors the priority bar according to task.priority', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(
      <KanbanCard
        task={baseTask}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-priority-high');
  });

  it('calls onOpen with the task when the card is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithProviders(
      <KanbanCard
        task={baseTask}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByText(baseTask.title));

    expect(onOpen).toHaveBeenCalledWith(baseTask);
  });

  it('does not call onOpen when a move button is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onMove = vi.fn();
    renderWithProviders(
      <KanbanCard
        task={baseTask}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        onMove={onMove}
        onDelete={vi.fn()}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole('button', { name: KANBAN_LABELS.moveForward(baseTask.title) }));

    expect(onMove).toHaveBeenCalledWith(baseTask, 'next');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not call onOpen when the delete button is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(
      <KanbanCard
        task={baseTask}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        onMove={vi.fn()}
        onDelete={onDelete}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole('button', { name: KANBAN_LABELS.deleteTask(baseTask.title) }));

    expect(onDelete).toHaveBeenCalledWith(baseTask);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('renders a done task struck through with a checkmark badge instead of a due-date label', () => {
    expect.assertions(2);
    renderWithProviders(
      <KanbanCard
        task={{ ...baseTask, status: 'DONE' }}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(baseTask.title)).toHaveClass('line-through');
    expect(screen.getByLabelText(KANBAN_LABELS.doneBadge)).toBeInTheDocument();
  });

  it('shows an inline move error when provided', () => {
    expect.assertions(1);
    renderWithProviders(
      <KanbanCard
        task={baseTask}
        lobby={lobby}
        assignee={assignee}
        isMoving={false}
        moveError="Couldn't move — try again"
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("Couldn't move — try again")).toBeInTheDocument();
  });
});
