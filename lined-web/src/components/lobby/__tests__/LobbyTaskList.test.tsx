import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { useCreateMenuStore } from '@/store/createMenu';
import { LobbyTaskList } from '../LobbyTaskList';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('LobbyTaskList', () => {
  it('shows a loading state while tasks are being fetched', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyTaskList lobbyId={1} />);

    expect(screen.getByTestId('lobby-tasks-loading')).toBeInTheDocument();
  });

  it('renders lobby tasks with correct filter-pill counts', async () => {
    expect.assertions(4);
    renderWithProviders(<LobbyTaskList lobbyId={1} />);

    expect(await screen.findByText('Plan dinner for Saturday')).toBeInTheDocument();
    expect(screen.getByText('Book restaurant reservation')).toBeInTheDocument();
    // Lobby 1 has 3 tasks in the fixtures: "Plan dinner..." (TODO), "Book
    // restaurant..." (IN_PROGRESS), and "Water the plants" (DONE).
    expect(screen.getByText('All (3)')).toBeInTheDocument();
    expect(screen.getByText('To Do (1)')).toBeInTheDocument();
  });

  it('filters the task rows when a filter pill is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LobbyTaskList lobbyId={1} />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByText('In Progress (1)'));

    expect(screen.queryByText('Plan dinner for Saturday')).not.toBeInTheDocument();
    expect(screen.getByText('Book restaurant reservation')).toBeInTheDocument();
  });

  it('shows an error message when the task list fails to load', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/tasks`, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<LobbyTaskList lobbyId={1} />);

    expect(await screen.findByText("Couldn't load tasks. Try again later.")).toBeInTheDocument();
  });

  it('shows an empty state when the lobby has no tasks', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/tasks`, () => HttpResponse.json([])));
    renderWithProviders(<LobbyTaskList lobbyId={1} />);

    expect(await screen.findByText('No tasks yet.')).toBeInTheDocument();
  });

  it('checking a row PATCHes the status and moves it to Done styling', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LobbyTaskList lobbyId={1} />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(
      screen.getByRole('checkbox', { name: 'Mark "Plan dinner for Saturday" as done' }),
    );

    await waitFor(() => {
      expect(screen.getByText('Plan dinner for Saturday')).toHaveClass('line-through');
    });
    expect(
      screen.getByRole('checkbox', { name: 'Mark "Plan dinner for Saturday" as to do' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('shows an inline error and keeps the row unchanged when the PATCH fails', async () => {
    expect.assertions(2);
    server.use(http.patch(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<LobbyTaskList lobbyId={1} />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(
      screen.getByRole('checkbox', { name: 'Mark "Plan dinner for Saturday" as done' }),
    );

    expect(await screen.findByText("Couldn't update — try again")).toBeInTheDocument();
    expect(screen.getByText('Plan dinner for Saturday')).not.toHaveClass('line-through');
  });

  it('opens the "task" create-menu overlay when "+ Add task" is clicked', async () => {
    expect.assertions(1);
    useCreateMenuStore.setState({ overlay: null });
    const user = userEvent.setup();
    renderWithProviders(<LobbyTaskList lobbyId={1} />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByText('+ Add task'));

    expect(useCreateMenuStore.getState().overlay).toBe('task');
  });

  it('opens the task-detail drawer for a row when it is clicked', async () => {
    expect.assertions(2);
    useCreateMenuStore.setState({ overlay: null, editingTask: null });
    const user = userEvent.setup();
    renderWithProviders(<LobbyTaskList lobbyId={1} />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByText('Plan dinner for Saturday'));

    expect(useCreateMenuStore.getState().overlay).toBe('task');
    expect(useCreateMenuStore.getState().editingTask?.title).toBe('Plan dinner for Saturday');
  });
});
