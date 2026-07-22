import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { ADD_MEMBER_MODAL_TEXT } from '@/test/lobbyMemberContent';
import { LobbyHeader } from '../LobbyHeader';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const lobby = MOCK_LOBBIES[0]!; // COUPLE, memberIds [1, 2]

describe('LobbyHeader', () => {
  it('renders the lobby name, type badge, and settings/add-member actions', async () => {
    expect.assertions(4);
    renderWithProviders(<LobbyHeader lobby={lobby} />);

    expect(screen.getByText(lobby.name)).toBeInTheDocument();
    expect(screen.getByText('Couple')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add member' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '⚙ Settings' })).toHaveAttribute(
      'href',
      `/lobbies/${lobby.id}/settings`,
    );
  });

  it('resolves and renders member avatars with the member count', async () => {
    expect.assertions(2);
    renderWithProviders(<LobbyHeader lobby={lobby} />);

    expect(await screen.findByText('2 members')).toBeInTheDocument();
    const avatars = screen.getByTestId('lobby-member-avatars');
    expect(avatars.children).toHaveLength(2);
  });

  it('falls back to a placeholder avatar when a member profile fails to load', async () => {
    expect.assertions(1);
    server.use(
      http.get(`${BASE}/users/:id`, ({ params }) => {
        if (params['id'] === '2') return new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
        const user = { id: 1, username: 'alex_johnson', email: 'alex@lined.app' };
        return HttpResponse.json(user);
      }),
    );
    renderWithProviders(<LobbyHeader lobby={lobby} />);

    const avatars = await screen.findByText('?');
    expect(avatars).toBeInTheDocument();
  });

  it('opens the Add Member modal when "+ Add member" is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LobbyHeader lobby={lobby} />);

    expect(screen.queryByText(ADD_MEMBER_MODAL_TEXT.title)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Add member' }));

    expect(screen.getByText(ADD_MEMBER_MODAL_TEXT.title)).toBeInTheDocument();
  });
});
