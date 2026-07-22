import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { LobbyDangerZoneCard } from '../LobbyDangerZoneCard';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // id 1, name "Alex & Anastasiia", ownerId 1, memberIds [1, 2]

const renderCard = (currentUserId: number | undefined) => {
  return renderWithProviders(
    <Routes>
      <Route
        path="/settings"
        element={<LobbyDangerZoneCard lobby={lobby} currentUserId={currentUserId} />}
      />
      <Route path="/" element={<div>Dashboard Page</div>} />
    </Routes>,
    { initialEntries: ['/settings'] },
  );
}

describe('LobbyDangerZoneCard', () => {
  it('shows Leave for both an owner and a non-owner, and Delete only for the owner', () => {
    expect.assertions(4);
    const { unmount } = renderCard(1);
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete lobby' })).toBeInTheDocument();
    unmount();

    renderCard(2);
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete lobby' })).not.toBeInTheDocument();
  });

  it('leaves the lobby and navigates home on success for a non-owner', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderCard(2);

    await user.click(screen.getByRole('button', { name: 'Leave' }));
    await user.click(screen.getAllByRole('button', { name: 'Leave' })[1]!);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
  });

  it('shows a friendly conflict message when the owner tries to leave', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderCard(1);

    await user.click(screen.getByRole('button', { name: 'Leave' }));
    await user.click(screen.getAllByRole('button', { name: 'Leave' })[1]!);

    expect(
      await screen.findByText(
        "You're the lobby owner — transfer ownership or delete the lobby instead of leaving",
      ),
    ).toBeInTheDocument();
  });

  it('shows a generic error when leaving fails unexpectedly', async () => {
    expect.assertions(1);
    server.use(
      http.delete(
        `${BASE}/lobbies/:lobbyId/members/:userId`,
        () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }),
      ),
    );
    const user = userEvent.setup();
    renderCard(2);

    await user.click(screen.getByRole('button', { name: 'Leave' }));
    await user.click(screen.getAllByRole('button', { name: 'Leave' })[1]!);

    expect(
      await screen.findByText('Could not leave this lobby — please try again'),
    ).toBeInTheDocument();
  });

  it('keeps the delete confirm button disabled until the lobby name is typed exactly', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderCard(1);

    await user.click(screen.getByRole('button', { name: 'Delete lobby' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Delete lobby' });
    expect(confirmButtons[1]).toBeDisabled();

    await user.type(screen.getByLabelText(`Type "${lobby.name}" to confirm`), lobby.name);

    expect(confirmButtons[1]).toBeEnabled();
  });

  it('deletes the lobby and navigates home on success', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderCard(1);

    await user.click(screen.getByRole('button', { name: 'Delete lobby' }));
    await user.type(screen.getByLabelText(`Type "${lobby.name}" to confirm`), lobby.name);
    await user.click(screen.getAllByRole('button', { name: 'Delete lobby' })[1]!);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
  });

  it('shows a generic error when deleting fails unexpectedly', async () => {
    expect.assertions(1);
    server.use(http.delete(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    renderCard(1);

    await user.click(screen.getByRole('button', { name: 'Delete lobby' }));
    await user.type(screen.getByLabelText(`Type "${lobby.name}" to confirm`), lobby.name);
    await user.click(screen.getAllByRole('button', { name: 'Delete lobby' })[1]!);

    expect(
      await screen.findByText('Could not delete this lobby — please try again'),
    ).toBeInTheDocument();
  });
});
