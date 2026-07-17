import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/test/data';
import { AddTaskDrawer } from '../AddTaskDrawer';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const LOBBY = MOCK_LOBBIES[0]!; // id 1, memberIds [1, 2]

describe('AddTaskDrawer', () => {
  it('shows an editable lobby select when not locked', () => {
    expect.assertions(2);
    renderWithProviders(<AddTaskDrawer lobbies={MOCK_LOBBIES} onClose={vi.fn()} />);

    const select = screen.getByLabelText('Lobby');
    expect(select).toBeInTheDocument();
    expect(select).toBeEnabled();
  });

  it('shows a static lobby name and no select when locked', () => {
    expect.assertions(2);
    renderWithProviders(
      <AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} />,
    );

    expect(screen.queryByLabelText('Lobby')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Task' })).toBeInTheDocument();
  });

  it('does not submit when the title is blank', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(
      <AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
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
      <AddTaskDrawer
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
      <AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
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
      <AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
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
      <AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} onCreated={onCreated} />,
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
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Task title'), 'Book flights');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid title');
  });

  it('surfaces a generic error on a 500 response', async () => {
    expect.assertions(1);
    server.use(http.post(`${BASE}/tasks`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={vi.fn()} />);

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
      <AddTaskDrawer lobbies={[LOBBY]} lockedLobbyId={LOBBY.id} onClose={onClose} onCreated={onCreated} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
