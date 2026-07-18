import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { TaskDto } from '@/features/tasks/model';
import type { UserDto } from '@/features/users/model';
import { TaskRow } from '../TaskRow';

const baseTask: TaskDto = {
  id: 1,
  title: 'Plan dinner for Saturday',
  description: 'Pick a restaurant and book a table for two',
  priority: 'MEDIUM',
  status: 'TODO',
  lobbyId: 1,
  creatorId: 1,
  assigneeId: 1,
  dueDate: null,
  createdAt: '2026-04-09T08:00:00Z',
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

describe('TaskRow', () => {
  it('renders title, description, status badge and assignee initial', () => {
    expect.assertions(4);
    renderWithProviders(
      <TaskRow task={baseTask} assignee={assignee} onToggle={vi.fn()} isUpdating={false} />,
    );

    expect(screen.getByText(baseTask.title)).toBeInTheDocument();
    expect(screen.getByText(baseTask.description!)).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('omits the description line when the task has none', () => {
    expect.assertions(1);
    renderWithProviders(
      <TaskRow
        task={{ ...baseTask, description: null }}
        assignee={assignee}
        onToggle={vi.fn()}
        isUpdating={false}
      />,
    );

    expect(screen.queryByText(baseTask.description!)).not.toBeInTheDocument();
  });

  it('renders a placeholder avatar when there is no assignee', () => {
    expect.assertions(1);
    renderWithProviders(
      <TaskRow
        task={{ ...baseTask, assigneeId: null }}
        assignee={undefined}
        onToggle={vi.fn()}
        isUpdating={false}
      />,
    );

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows the due date in red when overdue', () => {
    expect.assertions(1);
    renderWithProviders(
      <TaskRow
        task={{ ...baseTask, dueDate: '2020-01-01' }}
        assignee={assignee}
        onToggle={vi.fn()}
        isUpdating={false}
      />,
    );

    expect(screen.getByText('Jan 1')).toHaveClass('text-red-500');
  });

  it('renders a done task struck through and dimmed, with a checked checkbox', () => {
    expect.assertions(2);
    renderWithProviders(
      <TaskRow
        task={{ ...baseTask, status: 'DONE' }}
        assignee={assignee}
        onToggle={vi.fn()}
        isUpdating={false}
      />,
    );

    expect(screen.getByText(baseTask.title)).toHaveClass('line-through');
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle when the checkbox is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderWithProviders(
      <TaskRow task={baseTask} assignee={assignee} onToggle={onToggle} isUpdating={false} />,
    );

    await user.click(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledWith(baseTask);
  });

  it('disables the checkbox while an update is in flight', () => {
    expect.assertions(1);
    renderWithProviders(
      <TaskRow task={baseTask} assignee={assignee} onToggle={vi.fn()} isUpdating={true} />,
    );

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('shows an inline error message when provided', () => {
    expect.assertions(1);
    renderWithProviders(
      <TaskRow
        task={baseTask}
        assignee={assignee}
        onToggle={vi.fn()}
        isUpdating={false}
        updateError="Couldn't update — try again"
      />,
    );

    expect(screen.getByText("Couldn't update — try again")).toBeInTheDocument();
  });

  it('is not clickable when onOpen is omitted', () => {
    expect.assertions(1);
    renderWithProviders(
      <TaskRow task={baseTask} assignee={assignee} onToggle={vi.fn()} isUpdating={false} />,
    );

    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
  });

  it('calls onOpen with the task when the row is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithProviders(
      <TaskRow
        task={baseTask}
        assignee={assignee}
        onToggle={vi.fn()}
        isUpdating={false}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByText(baseTask.title));

    expect(onOpen).toHaveBeenCalledWith(baseTask);
  });

  it('does not call onOpen when the checkbox is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    renderWithProviders(
      <TaskRow
        task={baseTask}
        assignee={assignee}
        onToggle={onToggle}
        isUpdating={false}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledWith(baseTask);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
