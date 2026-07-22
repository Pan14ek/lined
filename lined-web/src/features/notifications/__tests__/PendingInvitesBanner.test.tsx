import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { PendingInvitesBanner } from '../PendingInvitesBanner';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const renderBanner = () => {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<PendingInvitesBanner />} />
      <Route path="/lobbies/:id" element={<div>Lobby Page</div>} />
    </Routes>,
    { initialEntries: ['/'] },
  );
}

describe('PendingInvitesBanner', () => {
  it('renders the pending invites section header with the invite count', async () => {
    expect.assertions(1);
    renderBanner();

    expect(await screen.findByText('Pending Invites · 3')).toBeInTheDocument();
  });

  it('shows a loading skeleton while fetching', () => {
    expect.assertions(1);
    server.use(
      http.get(
        `${BASE}/lobby-invites/mine`,
        () => new Promise(() => {}),
      ),
    );
    renderBanner();

    expect(screen.getByTestId('pending-invites-loading')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    expect.assertions(1);
    server.use(http.get(`${BASE}/lobby-invites/mine`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    renderBanner();

    expect(await screen.findByText("Couldn't load your invites. Try again later.")).toBeInTheDocument();
  });

  it('renders nothing when there are no pending invites', async () => {
    expect.assertions(2);
    server.use(http.get(`${BASE}/lobby-invites/mine`, () => HttpResponse.json([])));
    const { container } = renderBanner();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/Pending Invites/)).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('accepts an invite and navigates to the lobby', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderBanner();
    await screen.findByText('Pending Invites · 3');

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0]!);

    expect(await screen.findByText('Lobby Page')).toBeInTheDocument();
  });

  it('declines an invite after confirmation and removes the card', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderBanner();
    await screen.findByText('Pending Invites · 3');

    await user.click(screen.getAllByRole('button', { name: 'Decline' })[0]!);
    expect(screen.getByText('Decline invite')).toBeInTheDocument();

    const dialog = screen.getByTestId('confirm-dialog-backdrop');
    await user.click(within(dialog).getByRole('button', { name: 'Decline' }));

    expect(await screen.findByText('Pending Invites · 2')).toBeInTheDocument();
  });

  it('shows the stale-invite message and refetches on a 409 accept', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/lobby-invites/:inviteId/accept`, () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'Invite is no longer pending' }, { status: HTTP_STATUS.CONFLICT }),
      ),
    );
    const user = userEvent.setup();
    renderBanner();
    await screen.findByText('Pending Invites · 3');

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0]!);

    expect(await screen.findByText('This invite is no longer valid')).toBeInTheDocument();
  });
});
