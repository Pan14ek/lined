import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { useCreateMenuStore } from '@/store/createMenu';
import { CreateMenu } from '../CreateMenu';

describe('CreateMenu', () => {
  beforeEach(() => {
    useCreateMenuStore.setState({ isCreateLobbyOpen: false, overlay: null });
  });

  it('does not show the menu items until the trigger is clicked', () => {
    expect.assertions(1);
    renderWithProviders(<CreateMenu />);

    expect(screen.queryByText('New Event')).not.toBeInTheDocument();
  });

  it('lists all four create actions with the Reserve Free Slot row highlighted', async () => {
    expect.assertions(4);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText('New Event')).toBeInTheDocument();
    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByText('New Lobby')).toBeInTheDocument();
    expect(screen.getByText('Reserve Free Slot')).toBeInTheDocument();
  });

  it('opens the create-lobby overlay when "New Lobby" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(await screen.findByText('New Lobby'));

    expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
  });

  it('opens the "event" overlay when "New Event" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(await screen.findByText('New Event'));

    expect(useCreateMenuStore.getState().overlay).toBe('event');
  });

  it('opens the "task" overlay when "New Task" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(await screen.findByText('New Task'));

    expect(useCreateMenuStore.getState().overlay).toBe('task');
  });

  it('opens the "reserveSlot" overlay when "Reserve Free Slot" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(await screen.findByText('Reserve Free Slot'));

    expect(useCreateMenuStore.getState().overlay).toBe('reserveSlot');
  });
});
