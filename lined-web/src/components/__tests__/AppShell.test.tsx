import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/utils';
import { AppShell } from '../AppShell';
import { useAuthStore } from '@/store/auth';
import { useCreateMenuStore } from '@/store/createMenu';
import { CREATE_MENU_TEXT } from '@/test/createMenuContent';

describe('AppShell', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1, token: 'token' });
    useCreateMenuStore.setState({ isCreateLobbyOpen: false, overlay: null });
  });

  function renderShell(initialEntries: string[] = ['/']) {
    return renderWithProviders(
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<div>Page Content</div>} />
          <Route path="lobbies/:id" element={<div>Lobby Page Content</div>} />
        </Route>
      </Routes>,
      { initialEntries },
    );
  }

  it('renders the routed page content alongside the sidebar', async () => {
    expect.assertions(1);
    renderShell();

    expect(await screen.findByText('Page Content')).toBeInTheDocument();
  });

  it('does not render the create-lobby modal by default', () => {
    expect.assertions(1);
    renderShell();

    expect(screen.queryByText(CREATE_MENU_TEXT.newLobby)).not.toBeInTheDocument();
  });

  it('renders the create-lobby modal when the store flags it open', async () => {
    expect.assertions(1);
    useCreateMenuStore.setState({ isCreateLobbyOpen: true });
    renderShell();

    expect(await screen.findByText(CREATE_MENU_TEXT.newLobby)).toBeInTheDocument();
  });

  it('renders the create-event modal when the overlay is "event"', async () => {
    expect.assertions(1);
    useCreateMenuStore.setState({ overlay: 'event' });
    renderShell();

    expect(await screen.findByText(CREATE_MENU_TEXT.newEvent)).toBeInTheDocument();
  });

  it('renders the add-task drawer with a lobby select when the overlay is "task" outside a lobby route', async () => {
    expect.assertions(2);
    useCreateMenuStore.setState({ overlay: 'task' });
    renderShell();

    expect(await screen.findByRole('heading', { name: 'Add Task' })).toBeInTheDocument();
    expect(screen.getByLabelText('Lobby')).toBeInTheDocument();
  });

  it('locks the add-task drawer to the current lobby when opened from a lobby route', async () => {
    expect.assertions(2);
    useCreateMenuStore.setState({ overlay: 'task' });
    renderShell(['/lobbies/1']);

    expect(await screen.findByRole('heading', { name: 'Add Task' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Lobby')).not.toBeInTheDocument();
  });
});
