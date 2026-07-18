import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { LobbyDto } from '@/features/lobby/model';
import type { UserDto } from '@/features/users/model';
import { KanbanFilters } from '../KanbanFilters';
import { KANBAN_LABELS } from '../kanbanConstants';

const lobbies: LobbyDto[] = [
  { id: 1, name: 'Alex & Anastasiia', lobbyType: 'COUPLE', ownerId: 1, memberIds: [1, 2] },
];

const members: UserDto[] = [
  {
    id: 1,
    username: 'alex_johnson',
    email: 'alex@lined.app',
    createdAt: '2025-01-15T10:00:00Z',
    roles: ['ROLE_USER'],
    activePlan: null,
    activeUntil: null,
  },
];

describe('KanbanFilters', () => {
  it('renders lobby, member, and date-filter options', () => {
    expect.assertions(3);
    renderWithProviders(
      <KanbanFilters
        lobbies={lobbies}
        members={members}
        lobbyId={undefined}
        memberId={undefined}
        dateFilter="ALL"
        onLobbyChange={vi.fn()}
        onMemberChange={vi.fn()}
        onDateFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('option', { name: 'Alex & Anastasiia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'alex_johnson' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Overdue' })).toBeInTheDocument();
  });

  it('calls onLobbyChange with a number when a lobby is picked, and undefined for "All Lobbies"', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onLobbyChange = vi.fn();
    renderWithProviders(
      <KanbanFilters
        lobbies={lobbies}
        members={members}
        lobbyId={undefined}
        memberId={undefined}
        dateFilter="ALL"
        onLobbyChange={onLobbyChange}
        onMemberChange={vi.fn()}
        onDateFilterChange={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(KANBAN_LABELS.filterByLobby), '1');
    expect(onLobbyChange).toHaveBeenCalledWith(1);

    await user.selectOptions(screen.getByLabelText(KANBAN_LABELS.filterByLobby), 'All Lobbies');
    expect(onLobbyChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onDateFilterChange with the selected filter key', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onDateFilterChange = vi.fn();
    renderWithProviders(
      <KanbanFilters
        lobbies={lobbies}
        members={members}
        lobbyId={undefined}
        memberId={undefined}
        dateFilter="ALL"
        onLobbyChange={vi.fn()}
        onMemberChange={vi.fn()}
        onDateFilterChange={onDateFilterChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText(KANBAN_LABELS.filterByDate), 'This Week');

    expect(onDateFilterChange).toHaveBeenCalledWith('THIS_WEEK');
  });
});
