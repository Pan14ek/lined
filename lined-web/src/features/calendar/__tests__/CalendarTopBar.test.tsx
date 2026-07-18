import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LobbyDto } from '@/features/lobby/model';
import { CalendarTopBar } from '../CalendarTopBar';

const LOBBIES: LobbyDto[] = [
  { id: 1, name: 'Alex & Anastasiia', lobbyType: 'COUPLE', ownerId: 1, memberIds: [1, 2] },
  { id: 2, name: 'Weekend Crew', lobbyType: 'FRIENDS', ownerId: 1, memberIds: [1, 2] },
];

const baseProps = () => {
  return {
    title: 'July 2026',
    viewMode: 'week' as const,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onViewModeChange: vi.fn(),
    onNewEvent: vi.fn(),
  };
}

describe('CalendarTopBar — lobby filter', () => {
  it('does not show a Filters button when no lobbies are supplied', () => {
    expect.assertions(1);
    render(<CalendarTopBar {...baseProps()} />);

    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
  });

  it('does not show a Filters button for a single lobby (nothing to filter)', () => {
    expect.assertions(1);
    render(
      <CalendarTopBar
        {...baseProps()}
        lobbies={[LOBBIES[0]!]}
        hiddenLobbyIds={[]}
        onToggleLobby={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
  });

  it('shows a Filters button listing every lobby when there is more than one', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    render(
      <CalendarTopBar {...baseProps()} lobbies={LOBBIES} hiddenLobbyIds={[]} onToggleLobby={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));

    expect(await screen.findByText('Alex & Anastasiia')).toBeInTheDocument();
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
  });

  it('checks lobbies that are not hidden and unchecks hidden ones', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    render(
      <CalendarTopBar
        {...baseProps()}
        lobbies={LOBBIES}
        hiddenLobbyIds={[2]}
        onToggleLobby={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));

    expect(await screen.findByRole('menuitemcheckbox', { name: /Alex & Anastasiia/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemcheckbox', { name: /Weekend Crew/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onToggleLobby with the clicked lobby id', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onToggleLobby = vi.fn();
    render(
      <CalendarTopBar
        {...baseProps()}
        lobbies={LOBBIES}
        hiddenLobbyIds={[]}
        onToggleLobby={onToggleLobby}
      />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Weekend Crew/ }));

    expect(onToggleLobby).toHaveBeenCalledWith(2);
  });

  it('shows a badge with the count of hidden lobbies', () => {
    expect.assertions(1);
    render(
      <CalendarTopBar
        {...baseProps()}
        lobbies={LOBBIES}
        hiddenLobbyIds={[2]}
        onToggleLobby={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /filters/i })).toHaveTextContent('1');
  });
});
