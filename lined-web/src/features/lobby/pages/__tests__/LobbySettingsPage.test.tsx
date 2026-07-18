import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen } from '@/test/utils';
import { server } from '@/test/server';
import { useAuthStore } from '@/store/auth';
import { LobbySettingsPage } from '../LobbySettingsPage';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const renderSettingsPage = (initialEntry: string) => {
  return renderWithProviders(
    <Routes>
      <Route path="/lobbies/:id/settings" element={<LobbySettingsPage />} />
    </Routes>,
    { initialEntries: [initialEntry] },
  );
}

describe('LobbySettingsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
  });

  it('shows a loading state before the lobby loads', () => {
    expect.assertions(1);
    renderSettingsPage('/lobbies/1/settings');

    expect(screen.getByTestId('lobby-settings-page-loading')).toBeInTheDocument();
  });

  it('shows a friendly message when the lobby cannot be found', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: 404 })));
    renderSettingsPage('/lobbies/999/settings');

    expect(
      await screen.findByText(
        'Lobby not found. It may have been deleted, or you may not have access to it.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the header, breadcrumb, and all three settings cards for the owner', async () => {
    expect.assertions(6);
    renderSettingsPage('/lobbies/1/settings');

    expect(await screen.findByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to lobby' })).toHaveAttribute(
      'href',
      '/lobbies/1',
    );
    expect(screen.getByText('Lobby Settings')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Lobby Notifications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete lobby' })).toBeInTheDocument();
  });

  it('hides the Delete lobby action for a non-owner viewer', async () => {
    expect.assertions(2);
    useAuthStore.setState({ userId: 2 });
    renderSettingsPage('/lobbies/1/settings');

    expect(await screen.findByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete lobby' })).not.toBeInTheDocument();
  });
});
