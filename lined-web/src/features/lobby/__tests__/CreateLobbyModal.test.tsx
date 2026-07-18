import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { ROLES, CREATE_LOBBY_MODAL_TEXT, LOBBY_TYPE_OPTION_NAME } from '@/test/createMenuContent';
import { CreateLobbyModal } from '../CreateLobbyModal';
import { useAuthStore } from '@/store/auth';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const renderModal = (onClose = vi.fn()) => {
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
    useAuthStore.setState({ userId: 1 });
  });

  it('renders the name field, type picker, and hint text', () => {
    expect.assertions(3);
    renderModal();

    expect(screen.getByLabelText(CREATE_LOBBY_MODAL_TEXT.nameFieldLabel)).toBeInTheDocument();
    expect(
      screen.getByRole(ROLES.radiogroup, { name: CREATE_LOBBY_MODAL_TEXT.typeFieldLabel }),
    ).toBeInTheDocument();
    expect(screen.getByText(CREATE_LOBBY_MODAL_TEXT.ownerHint)).toBeInTheDocument();
  });

  it('disables the submit button until a name is entered', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderModal();

    expect(
      screen.getByRole(ROLES.button, { name: CREATE_LOBBY_MODAL_TEXT.submitButtonName }),
    ).toBeDisabled();

    await user.type(screen.getByLabelText(CREATE_LOBBY_MODAL_TEXT.nameFieldLabel), 'Weekend Crew');

    expect(
      screen.getByRole(ROLES.button, { name: CREATE_LOBBY_MODAL_TEXT.submitButtonName }),
    ).toBeEnabled();
  });

  it('calls onClose without posting when Cancel is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(
      screen.getByRole(ROLES.button, { name: CREATE_LOBBY_MODAL_TEXT.cancelButtonName }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates the lobby with the selected type and navigates to it', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.type(screen.getByLabelText(CREATE_LOBBY_MODAL_TEXT.nameFieldLabel), 'Weekend Crew');
    await user.click(screen.getByRole(ROLES.radio, { name: LOBBY_TYPE_OPTION_NAME.FRIENDS }));
    await user.click(
      screen.getByRole(ROLES.button, { name: CREATE_LOBBY_MODAL_TEXT.submitButtonName }),
    );

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

    await user.type(screen.getByLabelText(CREATE_LOBBY_MODAL_TEXT.nameFieldLabel), '   ok   ');
    await user.click(
      screen.getByRole(ROLES.button, { name: CREATE_LOBBY_MODAL_TEXT.submitButtonName }),
    );

    expect(await screen.findByRole(ROLES.alert)).toHaveTextContent('Enter a valid lobby name');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a generic error when the server fails unexpectedly (500)', async () => {
    expect.assertions(1);
    server.use(http.post(`${BASE}/lobbies`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(CREATE_LOBBY_MODAL_TEXT.nameFieldLabel), 'Weekend Crew');
    await user.click(
      screen.getByRole(ROLES.button, { name: CREATE_LOBBY_MODAL_TEXT.submitButtonName }),
    );

    expect(await screen.findByRole(ROLES.alert)).toHaveTextContent(
      'Something went wrong — please try again',
    );
  });

  it('closes when the backdrop is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByLabelText(CREATE_LOBBY_MODAL_TEXT.closeButtonName));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
