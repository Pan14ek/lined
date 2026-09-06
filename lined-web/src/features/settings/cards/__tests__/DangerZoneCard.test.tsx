import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { createTestQueryClient, renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useAuthStore } from '@/store/auth';
import { QUERY_KEYS } from '@/features/users/lib/constants';
import { DangerZoneCard } from '../DangerZoneCard';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobbyOwner = MOCK_USERS[0]!; // owns every mock lobby -> 409 on delete
const noLobbyUser = MOCK_USERS[2]!; // owns nothing -> 204 on delete

/** `useDeleteCurrentAccount` resolves its target id from the `/users/me` cache. */
const renderCard = (userId: number | undefined) => {
  const queryClient = createTestQueryClient();
  if (userId != null) {
    const currentUser = MOCK_USERS.find((u) => u.id === userId);
    queryClient.setQueryData(QUERY_KEYS.currentUser, currentUser);
  }
  return renderWithProviders(
    <Routes>
      <Route path="/settings" element={<DangerZoneCard userId={userId} />} />
      <Route path="/sign-in" element={<div>Sign In Page</div>} />
    </Routes>,
    { initialEntries: ['/settings'], queryClient },
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

    expect(screen.getByTestId('confirm-dialog-backdrop')).toBeInTheDocument();
  });

  it('shows the lobby-ownership conflict message on 409', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderCard(lobbyOwner.id);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getAllByRole('button', { name: 'Delete account' })[1]!);

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
    await user.click(screen.getAllByRole('button', { name: 'Delete account' })[1]!);

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
    await user.click(screen.getAllByRole('button', { name: 'Delete account' })[1]!);

    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBeNull(),
    );
    expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
  });
});
