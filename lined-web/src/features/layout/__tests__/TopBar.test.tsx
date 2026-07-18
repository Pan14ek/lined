import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { TopBar } from '../TopBar';
import { useUiStore } from '@/store/ui';

describe('TopBar', () => {
  beforeEach(() => {
    useUiStore.setState({ isSidebarDrawerOpen: false });
  });

  it('opens the sidebar drawer when the menu button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<TopBar />, { initialEntries: ['/'] });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(useUiStore.getState().isSidebarDrawerOpen).toBe(true);
  });

  it('shows "Dashboard" for the root route', () => {
    expect.assertions(1);
    renderWithProviders(<TopBar />, { initialEntries: ['/'] });

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows the mapped title for a known route', () => {
    expect.assertions(1);
    renderWithProviders(<TopBar />, { initialEntries: ['/calendar'] });

    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
  });

  it('shows "Lobby" for any lobby detail route', () => {
    expect.assertions(1);
    renderWithProviders(<TopBar />, { initialEntries: ['/lobbies/42'] });

    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeInTheDocument();
  });

  it('falls back to "Lined" for an unmapped route', () => {
    expect.assertions(1);
    renderWithProviders(<TopBar />, { initialEntries: ['/somewhere-else'] });

    expect(screen.getByRole('heading', { name: 'Lined' })).toBeInTheDocument();
  });
});
