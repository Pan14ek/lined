import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { useCreateMenuStore } from '@/store/createMenu';
import { KanbanBoard } from '../KanbanBoard';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

describe('KanbanBoard', () => {
  it('shows a loading state while tasks are being fetched', () => {
    expect.assertions(1);
    renderWithProviders(<KanbanBoard />);

    expect(screen.getByTestId('kanban-loading')).toBeInTheDocument();
  });

  it('groups tasks into the correct columns with counts', async () => {
    expect.assertions(4);
    renderWithProviders(<KanbanBoard />);

    expect(await screen.findByText('Plan dinner for Saturday')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-TODO')).toHaveTextContent('3');
    expect(screen.getByTestId('kanban-column-IN_PROGRESS')).toHaveTextContent('2');
    expect(screen.getByTestId('kanban-column-DONE')).toHaveTextContent('1');
  });

  it('shows an error message when the tasks request fails', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/tasks/mine`, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<KanbanBoard />);

    expect(
      await screen.findByText("Couldn't load your tasks. Try again later."),
    ).toBeInTheDocument();
  });

  it('renders done tasks dimmed, struck through, with a checkmark badge', async () => {
    expect.assertions(2);
    renderWithProviders(<KanbanBoard />);

    const title = await screen.findByText('Buy groceries');
    expect(title).toHaveClass('line-through');
    expect(screen.getByTestId('kanban-column-DONE')).toHaveTextContent('✓');
  });

  it('moving a card forward PATCHes its status and moves it to the next column', async () => {
    expect.assertions(3);
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByRole('button', { name: 'Move "Plan dinner for Saturday" forward' }));

    await waitFor(() => {
      expect(screen.getByTestId('kanban-column-IN_PROGRESS')).toHaveTextContent(
        'Plan dinner for Saturday',
      );
    });
    expect(screen.getByTestId('kanban-column-TODO')).not.toHaveTextContent(
      'Plan dinner for Saturday',
    );
    expect(screen.getByTestId('kanban-column-TODO')).toHaveTextContent('2');
  });

  it('shows an inline error and keeps the card in place when the move PATCH fails', async () => {
    expect.assertions(2);
    server.use(http.patch(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByRole('button', { name: 'Move "Plan dinner for Saturday" forward' }));

    expect(await screen.findByText("Couldn't move — try again")).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-TODO')).toHaveTextContent('Plan dinner for Saturday');
  });

  it('deletes a task after confirming, removing it from the board', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByRole('button', { name: 'Delete "Plan dinner for Saturday"' }));
    expect(screen.getByText('Delete task')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Plan dinner for Saturday')).not.toBeInTheDocument();
    });
  });

  it('shows an inline error and keeps the task when the delete request fails', async () => {
    expect.assertions(2);
    server.use(http.delete(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByRole('button', { name: 'Delete "Plan dinner for Saturday"' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText("Couldn't delete this task — please try again"),
    ).toBeInTheDocument();
    expect(screen.getByText('Plan dinner for Saturday')).toBeInTheDocument();
  });

  it('narrows the board to a single lobby via the lobby filter', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.selectOptions(screen.getByLabelText('Filter by lobby'), 'Weekend Crew');

    expect(screen.queryByText('Plan dinner for Saturday')).not.toBeInTheDocument();
    expect(screen.getByText('Prepare presentation slides')).toBeInTheDocument();
  });

  it('opens AddTaskDrawer with the column status preselected from "+ Add task"', async () => {
    expect.assertions(1);
    useCreateMenuStore.setState({ overlay: null, taskInitialStatus: null });
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(screen.getByRole('button', { name: 'Add task to In Progress' }));

    expect(useCreateMenuStore.getState().taskInitialStatus).toBe('IN_PROGRESS');
  });
});
