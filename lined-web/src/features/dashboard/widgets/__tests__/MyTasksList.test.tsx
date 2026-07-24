import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { MyTasksList } from '../MyTasksList';
import type { TaskDto } from '@/features/tasks/model';

afterEach(() => {
  vi.useRealTimers();
});

const TASKS: TaskDto[] = [
  {
    id: 1,
    title: 'Book restaurant reservation',
    description: null,
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    lobbyId: 1,
    creatorId: 2,
    assigneeId: 1,
    dueDate: '2026-03-28',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Plan weekly meals',
    description: null,
    priority: 'MEDIUM',
    status: 'TODO',
    lobbyId: 1,
    creatorId: 1,
    assigneeId: 1,
    dueDate: '2026-04-01',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 3,
    title: 'Send birthday invites',
    description: null,
    priority: 'LOW',
    status: 'DONE',
    lobbyId: 1,
    creatorId: 1,
    assigneeId: 1,
    dueDate: '2026-03-20',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

describe('MyTasksList', () => {
  it('renders each task with its title, status badge, and an "All tasks" link', () => {
    expect.assertions(3);
    renderWithProviders(
      <MyTasksList tasks={TASKS} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByText('Book restaurant reservation')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all tasks/i })).toHaveAttribute(
      'href',
      '/tasks',
    );
  });

  it('shows a task due today in red as urgent', () => {
    expect.assertions(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T08:00:00Z'));
    renderWithProviders(
      <MyTasksList tasks={TASKS} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    const dueLabel = screen.getByText('Today');
    expect(dueLabel).toHaveClass('text-red-500');
  });

  it('shows a loading skeleton while tasks are loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <MyTasksList tasks={undefined} isLoading={true} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByTestId('my-tasks-loading')).toBeInTheDocument();
  });

  it('shows an empty state when no tasks are assigned', () => {
    expect.assertions(1);
    renderWithProviders(
      <MyTasksList tasks={[]} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('shows an inline error message with a working retry action when tasks fail to load', async () => {
    expect.assertions(2);
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <MyTasksList tasks={undefined} isLoading={false} isError={true} onRetry={onRetry} />,
    );

    expect(screen.getByText(/couldn't load your tasks/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
