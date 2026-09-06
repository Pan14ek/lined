import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useAuthStore } from '@/store/auth';
import { DangerZoneCard } from '../DangerZoneCard';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobbyOwner = MOCK_USERS[0]!; // owns every mock lobby -> 409 on delete
const noLobbyUser = MOCK_USERS[2]!; // owns nothing -> 204 on delete

const renderCard = (userId: number | undefined) => {
  return renderWithProviders(
    <Routes>
      <Route path="/settings" element={<DangerZoneCard userId={userId} />} />
      <Route path="/sign-in" element={<div>Sign In Page</div>} />
    </Routes>,
    { initialEntries: ['/settings'] },
  );
}

describe('DangerZoneCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: `mock-token-${lobbyOwner.id}`, status: 'authenticated' });
  });

  it('renders the Delete account button disabled when there is no user yet', () => {
    expect.assertions(1);
    renderCard(undefined);

    expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled();
  });

  it('opens a confirm dialog before deleting', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderCard(lobbyOwner.id);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the lobby-ownership conflict message on 409', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderCard(lobbyOwner.id);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(
      await screen.findByText(
        'You still own one or more lobbies — transfer ownership or delete them first',
      ),
    ).toBeInTheDocument();
  });

  it('shows a generic error on an unexpected 500', async () => {
    expect.assertions(1);
    server.use(http.delete(`${BASE}/users/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    renderCard(lobbyOwner.id);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(
      await screen.findByText('Could not delete your account — please try again'),
    ).toBeInTheDocument();
  });

  it('signs out and navigates to sign-in on success', async () => {
    expect.assertions(2);
    useAuthStore.setState({ accessToken: `mock-token-${noLobbyUser.id}`, status: 'authenticated' });
    const user = userEvent.setup();
    renderCard(noLobbyUser.id);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBeNull(),
    );
    expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
  });
});
