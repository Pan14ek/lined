import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { MOCK_TASKS } from '@/features/tasks/api/mockData';
import { TaskDrawer } from '../TaskDrawer';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, memberIds [1, 2]
// id 1, lobbyId 1, creatorId 1, assigneeId 1, priority MEDIUM, status TODO
const TASK = MOCK_TASKS[0]!;

describe('TaskDrawer', () => {
  it('shows an editable lobby select when not locked', () => {
    expect.assertions(2);
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} onClose={vi.fn()} />);

    const select = screen.getByLabelText('Lobby');
    expect(select).toBeInTheDocument();
    expect(select).toBeEnabled();
  });

  it('shows a static lobby name and no select when locked', () => {
    expect.assertions(2);
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} />,
    );

    expect(screen.queryByLabelText('Lobby')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Task' })).toBeInTheDocument();
  });

  it('does not submit when the title is blank', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(onCreated).not.toHaveBeenCalled();
  });

  it('submits with the locked lobby id, title, status, and notifyAssignee, calling onCreated then onClose', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <TaskDrawer
        lobbies={[LOBBY]}
        lockedLobbyId={LOBBY.id}
        onClose={onClose}
        onCreated={onCreated}
      />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Book flights',
          lobbyId: LOBBY.id,
          status: 'TODO',
          notifyAssignee: true,
        }),
      ),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('includes the selected assignee id in the request payload', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.click(await screen.findByRole('radio', { name: 'nastia_k' }));
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 2 })),
    );
  });

  it('lets the user change status before submitting', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ status: 'IN_PROGRESS' })),
    );
  });

  it('shows an inline warning but still allows submit when the due date is in the past', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Overdue thing');
    await user.type(screen.getByLabelText('Due date'), '2020-01-01');
    expect(await screen.findByText(/in the past/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Task' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it('surfaces an inline error on a 400 response', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/tasks`, () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'title must not be blank' },
          { status: HTTP_STATUS.BAD_REQUEST },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid title');
  });

  it('surfaces a generic error on a 500 response', async () => {
    expect.assertions(1);
    server.use(http.post(`${BASE}/tasks`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    renderWithProviders(<TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't create task — please try again",
    );
  });

  it('calls onClose without submitting when Cancel is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={onClose} onCreated={onCreated} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('defaults priority to Medium and includes it in the request payload', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ priority: 'MEDIUM' })),
    );
  });

  it('lets the user change priority before submitting', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <TaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ priority: 'HIGH' })),
    );
  });
});

describe('TaskDrawer — edit mode', () => {
  it('shows "Task details", pre-fills fields, and shows the created-by meta line', async () => {
    expect.assertions(4);
    renderWithProviders(
      <TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Task details' })).toBeInTheDocument();
    expect(screen.getByDisplayValue(TASK.title)).toBeInTheDocument();
    expect(screen.getByDisplayValue(TASK.description!)).toBeInTheDocument();
    expect(await screen.findByText(/Created .* by alex_johnson · Alex & Anastasiia/)).toBeInTheDocument();
  });

  it('does not show a lobby select in edit mode', () => {
    expect.assertions(1);
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={vi.fn()} />);

    expect(screen.queryByLabelText('Lobby')).not.toBeInTheDocument();
  });

  it('PATCHes only the title when just the title changed', async () => {
    expect.assertions(1);
    let requestBody: unknown;
    server.use(
      http.patch(`${BASE}/tasks/:id`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ ...TASK, ...(requestBody as object) });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={vi.fn()} />);

    const titleInput = screen.getByDisplayValue(TASK.title);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(requestBody).toEqual({ title: 'Updated title' }));
  });

  it('round-trips assignee, due date, priority, and status edits', async () => {
    expect.assertions(1);
    let requestBody: unknown;
    server.use(
      http.patch(`${BASE}/tasks/:id`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ ...TASK, ...(requestBody as object) });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={vi.fn()} />);

    await user.click(await screen.findByRole('radio', { name: 'nastia_k' }));
    await user.clear(screen.getByLabelText('Due date'));
    await user.type(screen.getByLabelText('Due date'), '2026-08-20');
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(requestBody).toEqual({
        assigneeId: 2,
        dueDate: '2026-08-20',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
      }),
    );
  });

  it('closes the drawer after a successful save', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={onClose} />);

    const titleInput = screen.getByDisplayValue(TASK.title);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('surfaces an inline error and keeps the drawer open on a 400 save response', async () => {
    expect.assertions(2);
    server.use(
      http.patch(`${BASE}/tasks/:id`, () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'title must not be blank' },
          { status: HTTP_STATUS.BAD_REQUEST },
        ),
      ),
    );
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={onClose} />);

    const titleInput = screen.getByDisplayValue(TASK.title);
    await user.clear(titleInput);
    await user.type(titleInput, 'Bad title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid title');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('surfaces a generic error on a 500 save response', async () => {
    expect.assertions(1);
    server.use(http.patch(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={vi.fn()} />);

    const titleInput = screen.getByDisplayValue(TASK.title);
    await user.clear(titleInput);
    await user.type(titleInput, 'Bad title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save changes — please try again",
    );
  });

  it('deletes the task after confirming and closes the drawer', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete task')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('shows an inline error and keeps the confirm dialog open when delete fails', async () => {
    expect.assertions(2);
    server.use(http.delete(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText("Couldn't delete this task — please try again")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancelling the delete confirmation keeps the task and closes only the dialog', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<TaskDrawer lobbies={MOCK_LOBBIES} task={TASK} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Delete task')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
