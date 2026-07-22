import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { LobbyPage } from '../LobbyPage';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const renderLobbyPage = (initialEntry: string) => {
  return renderWithProviders(
    <Routes>
      <Route path="/lobbies/:id" element={<LobbyPage />} />
    </Routes>,
    { initialEntries: [initialEntry] },
  );
}

describe('LobbyPage', () => {
  it('renders the header, tab bar, and the tasks tab by default', async () => {
    expect.assertions(3);
    renderLobbyPage('/lobbies/1');

    expect(await screen.findByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '✅ Tasks' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Plan dinner for Saturday')).toBeInTheDocument();
  });

  it('shows a friendly message when the lobby cannot be found', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND })));
    renderLobbyPage('/lobbies/999');

    expect(
      await screen.findByText(
        'Lobby not found. It may have been deleted, or you may not have access to it.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the lobby calendar on the calendar tab', async () => {
    expect.assertions(2);
    renderLobbyPage('/lobbies/1?tab=calendar');

    expect(await screen.findByRole('button', { name: /new event/i })).toBeInTheDocument();
    expect(screen.queryByText('Plan dinner for Saturday')).not.toBeInTheDocument();
  });

  it('shows the real member list on the members tab', async () => {
    expect.assertions(1);
    renderLobbyPage('/lobbies/1?tab=members');

    expect(await screen.findByText('Members · 2')).toBeInTheDocument();
  });

  it('switches to the tasks tab and updates the URL when clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderLobbyPage('/lobbies/1?tab=members');
    await screen.findByText('Members · 2');

    await user.click(screen.getByRole('tab', { name: '✅ Tasks' }));

    expect(await screen.findByText('Plan dinner for Saturday')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '✅ Tasks' })).toHaveAttribute('aria-selected', 'true');
  });
});
