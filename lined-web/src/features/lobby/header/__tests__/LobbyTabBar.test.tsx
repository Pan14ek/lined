import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { LobbyTabBar } from '../LobbyTabBar';

describe('LobbyTabBar', () => {
  it('renders all three tabs with their emoji labels', () => {
    expect.assertions(3);
    renderWithProviders(
      <LobbyTabBar lobbyType="COUPLE" activeTab="tasks" onTabChange={vi.fn()} />,
    );

    expect(screen.getByRole('tab', { name: '📅 Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '✅ Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '👥 Members' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    expect.assertions(2);
    renderWithProviders(
      <LobbyTabBar lobbyType="COUPLE" activeTab="calendar" onTabChange={vi.fn()} />,
    );

    expect(screen.getByRole('tab', { name: '📅 Calendar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: '✅ Tasks' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onTabChange with the clicked tab id', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderWithProviders(
      <LobbyTabBar lobbyType="COUPLE" activeTab="tasks" onTabChange={onTabChange} />,
    );

    await user.click(screen.getByRole('tab', { name: '👥 Members' }));

    expect(onTabChange).toHaveBeenCalledWith('members');
  });
});
