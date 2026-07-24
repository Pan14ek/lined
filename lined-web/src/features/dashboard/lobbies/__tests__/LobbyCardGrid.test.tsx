import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { useCreateMenuStore } from '@/store/createMenu';
import { LobbyCardGrid } from '../LobbyCardGrid';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { MOCK_TASKS } from '@/features/tasks/api/mockData';

describe('LobbyCardGrid', () => {
  beforeEach(() => {
    useCreateMenuStore.setState({ isCreateLobbyOpen: false });
  });

  it('renders a card per lobby with member/event/task counts', () => {
    expect.assertions(4);
    renderWithProviders(
      <LobbyCardGrid
        lobbies={MOCK_LOBBIES}
        upcomingEvents={MOCK_EVENTS}
        myTasks={MOCK_TASKS}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.getByText('Johnson Family')).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
    // Lobby 1 has 2 members in the fixtures, so its "2 members" stat renders.
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('shows a loading skeleton while lobbies are loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <LobbyCardGrid
        lobbies={undefined}
        upcomingEvents={undefined}
        myTasks={undefined}
        isLoading={true}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId('lobby-cards-loading')).toBeInTheDocument();
  });

  it('shows an empty state with a create-lobby affordance when there are no lobbies', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(
      <LobbyCardGrid
        lobbies={[]}
        upcomingEvents={[]}
        myTasks={[]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/no lobbies yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create lobby/i }));
    expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
  });

  it('shows an inline error message with a working retry action when lobbies fail to load', async () => {
    expect.assertions(2);
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <LobbyCardGrid
        lobbies={undefined}
        upcomingEvents={undefined}
        myTasks={undefined}
        isLoading={false}
        isError={true}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/couldn't load your lobbies/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
