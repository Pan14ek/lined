import { describe, it, expect } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { useCreateMenuStore } from '@/store/createMenu';
import { KanbanBoard } from '../KanbanBoard';
import { TASK_DRAG_DATA_FORMAT } from '../KanbanCard';
import { KANBAN_LABELS, KANBAN_TEST_IDS, KANBAN_TEXT } from '../kanbanConstants';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

/** jsdom has no real DataTransfer — a minimal stand-in for HTML5 drag events. */
const createDataTransferMock = () => {
  const store: Record<string, string> = {};
  const types: string[] = [];
  return {
    setData: (format: string, data: string) => {
      store[format] = data;
      if (!types.includes(format)) types.push(format);
    },
    getData: (format: string) => store[format] ?? '',
    types,
    effectAllowed: 'none',
    dropEffect: 'none',
  };
};

describe('KanbanBoard', () => {
  it('shows a loading state while tasks are being fetched', () => {
    expect.assertions(1);
    renderWithProviders(<KanbanBoard />);

    expect(screen.getByTestId(KANBAN_TEST_IDS.loading)).toBeInTheDocument();
  });

  it('groups tasks into the correct columns with counts', async () => {
    expect.assertions(4);
    renderWithProviders(<KanbanBoard />);

    expect(await screen.findByText('Plan dinner for Saturday')).toBeInTheDocument();
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('TODO'))).toHaveTextContent('3');
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('IN_PROGRESS'))).toHaveTextContent('2');
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('DONE'))).toHaveTextContent('1');
  });

  it('shows an error message when the tasks request fails', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/tasks/mine`, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<KanbanBoard />);

    expect(await screen.findByText(KANBAN_TEXT.loadError)).toBeInTheDocument();
  });

  it('renders done tasks dimmed, struck through, with a checkmark badge', async () => {
    expect.assertions(2);
    renderWithProviders(<KanbanBoard />);

    const title = await screen.findByText('Buy groceries');
    expect(title).toHaveClass('line-through');
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('DONE'))).toHaveTextContent('✓');
  });

  it('moving a card forward PATCHes its status and moves it to the next column', async () => {
    expect.assertions(3);
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(
      screen.getByRole('button', { name: KANBAN_LABELS.moveForward('Plan dinner for Saturday') }),
    );

    await waitFor(() => {
      expect(screen.getByTestId(KANBAN_TEST_IDS.column('IN_PROGRESS'))).toHaveTextContent(
        'Plan dinner for Saturday',
      );
    });
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('TODO'))).not.toHaveTextContent(
      'Plan dinner for Saturday',
    );
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('TODO'))).toHaveTextContent('2');
  });

  it('shows an inline error and keeps the card in place when the move PATCH fails', async () => {
    expect.assertions(2);
    server.use(http.patch(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(
      screen.getByRole('button', { name: KANBAN_LABELS.moveForward('Plan dinner for Saturday') }),
    );

    expect(await screen.findByText(KANBAN_TEXT.moveError)).toBeInTheDocument();
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('TODO'))).toHaveTextContent(
      'Plan dinner for Saturday',
    );
  });

  it('deletes a task after confirming, removing it from the board', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(
      screen.getByRole('button', { name: KANBAN_LABELS.deleteTask('Plan dinner for Saturday') }),
    );
    expect(screen.getByText(KANBAN_TEXT.deleteDialogTitle)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: KANBAN_TEXT.deleteConfirmLabel }));

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

    await user.click(
      screen.getByRole('button', { name: KANBAN_LABELS.deleteTask('Plan dinner for Saturday') }),
    );
    await user.click(screen.getByRole('button', { name: KANBAN_TEXT.deleteConfirmLabel }));

    expect(await screen.findByText(KANBAN_TEXT.deleteError)).toBeInTheDocument();
    expect(screen.getByText('Plan dinner for Saturday')).toBeInTheDocument();
  });

  it('narrows the board to a single lobby via the lobby filter', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.selectOptions(screen.getByLabelText(KANBAN_LABELS.filterByLobby), 'Weekend Crew');

    expect(screen.queryByText('Plan dinner for Saturday')).not.toBeInTheDocument();
    expect(screen.getByText('Prepare presentation slides')).toBeInTheDocument();
  });

  it('opens AddTaskDrawer with the column status preselected from "+ Add task"', async () => {
    expect.assertions(1);
    useCreateMenuStore.setState({ overlay: null, taskInitialStatus: null });
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    await user.click(
      screen.getByRole('button', { name: KANBAN_LABELS.addTaskToColumn('In Progress') }),
    );

    expect(useCreateMenuStore.getState().taskInitialStatus).toBe('IN_PROGRESS');
  });

  it('dragging a card onto another column PATCHes its status and moves it there', async () => {
    expect.assertions(3);
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    const card = screen.getByTestId(KANBAN_TEST_IDS.card(1));
    const doneColumn = screen.getByTestId(KANBAN_TEST_IDS.column('DONE'));
    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(card, { dataTransfer });
    dataTransfer.setData(TASK_DRAG_DATA_FORMAT, '1');
    fireEvent.dragOver(doneColumn, { dataTransfer });
    fireEvent.drop(doneColumn, { dataTransfer });

    expect(await within(doneColumn).findByText('Plan dinner for Saturday')).toBeInTheDocument();
    expect(screen.getByTestId(KANBAN_TEST_IDS.column('TODO'))).not.toHaveTextContent(
      'Plan dinner for Saturday',
    );
    expect(doneColumn).toHaveTextContent('2');
  });

  it('dropping a card back onto its own column leaves the board unchanged', async () => {
    expect.assertions(2);
    renderWithProviders(<KanbanBoard />);
    await screen.findByText('Plan dinner for Saturday');

    const card = screen.getByTestId(KANBAN_TEST_IDS.card(1));
    const todoColumn = screen.getByTestId(KANBAN_TEST_IDS.column('TODO'));
    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(card, { dataTransfer });
    dataTransfer.setData(TASK_DRAG_DATA_FORMAT, '1');
    fireEvent.dragOver(todoColumn, { dataTransfer });
    fireEvent.drop(todoColumn, { dataTransfer });

    expect(todoColumn).toHaveTextContent('Plan dinner for Saturday');
    expect(todoColumn).toHaveTextContent('3');
  });
});
