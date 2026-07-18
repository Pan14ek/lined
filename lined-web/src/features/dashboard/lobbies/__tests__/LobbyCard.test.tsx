import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import type { LobbyDto } from '@/features/lobby/model';
import { LobbyCard } from '../LobbyCard';

const lobby: LobbyDto = {
  id: 4,
  name: 'Design Team',
  lobbyType: 'WORK',
  ownerId: 1,
  memberIds: [1, 5, 6, 7],
};

describe('LobbyCard', () => {
  it('renders the lobby name, type badge, and counts', () => {
    expect.assertions(4);
    renderWithProviders(<LobbyCard lobby={lobby} eventCount={2} taskCount={9} />);

    expect(screen.getByText('Design Team')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('links to the lobby detail page', () => {
    expect.assertions(1);
    renderWithProviders(<LobbyCard lobby={lobby} eventCount={0} taskCount={0} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/lobbies/4');
  });

  it('renders zero counts for a lobby with no events or tasks', () => {
    expect.assertions(2);
    renderWithProviders(<LobbyCard lobby={lobby} eventCount={0} taskCount={0} />);

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(2);
    expect(screen.getByText(String(lobby.memberIds.length))).toBeInTheDocument();
  });
});
