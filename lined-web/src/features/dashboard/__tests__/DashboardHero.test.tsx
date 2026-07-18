import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { useCreateMenuStore } from '@/store/createMenu';
import { DashboardHero } from '../DashboardHero';

describe('DashboardHero', () => {
  beforeEach(() => {
    useCreateMenuStore.setState({ isCreateLobbyOpen: false, lobbyTypeInitial: null });
  });

  it('greets the user by username and lists all four lobby types', () => {
    expect.assertions(5);
    renderWithProviders(<DashboardHero username="alex_johnson" />);

    expect(screen.getByText('Welcome to Lined, alex_johnson!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Couple/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Family/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Friends/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Work/ })).toBeInTheDocument();
  });

  it('opens the create-lobby modal preselected to the clicked type', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<DashboardHero username="alex_johnson" />);

    await user.click(screen.getByRole('button', { name: /Family/ }));

    expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
    expect(useCreateMenuStore.getState().lobbyTypeInitial).toBe('FAMILY');
  });

  it('opens the create-lobby modal with no preselected type from the main CTA', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<DashboardHero username="alex_johnson" />);

    await user.click(screen.getByRole('button', { name: '+ Create your first lobby' }));

    expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
    expect(useCreateMenuStore.getState().lobbyTypeInitial).toBeNull();
  });
});
