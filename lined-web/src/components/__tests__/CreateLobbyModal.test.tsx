import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { CreateLobbyModal } from '../CreateLobbyModal';
import { useAuthStore } from '@/store/auth';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

function renderModal(onClose = vi.fn()) {
  return {
    onClose,
    ...renderWithProviders(
      <Routes>
        <Route path="/" element={<CreateLobbyModal onClose={onClose} />} />
        <Route path="/lobbies/:id" element={<div>Lobby Page</div>} />
      </Routes>,
      { initialEntries: ['/'] },
    ),
  };
}

describe('CreateLobbyModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1, token: 'token' });
  });

  it('renders the name field, type picker, and hint text', () => {
    expect.assertions(3);
    renderModal();

    expect(screen.getByLabelText(/lobby name/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /lobby type/i })).toBeInTheDocument();
    expect(screen.getByText(/you'll be the owner/i)).toBeInTheDocument();
  });

  it('disables the submit button until a name is entered', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByRole('button', { name: /create lobby/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/lobby name/i), 'Weekend Crew');

    expect(screen.getByRole('button', { name: /create lobby/i })).toBeEnabled();
  });

  it('calls onClose without posting when Cancel is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates the lobby with the selected type and navigates to it', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.type(screen.getByLabelText(/lobby name/i), 'Weekend Crew');
    await user.click(screen.getByRole('radio', { name: /friends/i }));
    await user.click(screen.getByRole('button', { name: /create lobby/i }));

    expect(await screen.findByText('Lobby Page')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error and keeps the modal open when the name is rejected (400)', async () => {
    expect.assertions(2);
    server.use(
      http.post(`${BASE}/lobbies`, () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'name must not be blank' },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.type(screen.getByLabelText(/lobby name/i), '   ok   ');
    await user.click(screen.getByRole('button', { name: /create lobby/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid lobby name');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a generic error when the server fails unexpectedly (500)', async () => {
    expect.assertions(1);
    server.use(http.post(`${BASE}/lobbies`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/lobby name/i), 'Weekend Crew');
    await user.click(screen.getByRole('button', { name: /create lobby/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong — please try again',
    );
  });

  it('closes when the backdrop is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByLabelText(/close/i));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
