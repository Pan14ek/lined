import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { useCreateMenuStore } from '@/store/createMenu';
import { ROLES, CREATE_MENU_TEXT } from '@/test/createMenuContent';
import { CreateMenu } from '../CreateMenu';

describe('CreateMenu', () => {
  beforeEach(() => {
    useCreateMenuStore.setState({ isCreateLobbyOpen: false, overlay: null });
  });

  it('does not show the menu items until the trigger is clicked', () => {
    expect.assertions(1);
    renderWithProviders(<CreateMenu />);

    expect(screen.queryByText(CREATE_MENU_TEXT.newEvent)).not.toBeInTheDocument();
  });

  it('lists all four create actions with the Reserve Free Slot row highlighted', async () => {
    expect.assertions(4);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole(ROLES.button, { name: CREATE_MENU_TEXT.triggerName }));

    expect(await screen.findByText(CREATE_MENU_TEXT.newEvent)).toBeInTheDocument();
    expect(screen.getByText(CREATE_MENU_TEXT.newTask)).toBeInTheDocument();
    expect(screen.getByText(CREATE_MENU_TEXT.newLobby)).toBeInTheDocument();
    expect(screen.getByText(CREATE_MENU_TEXT.reserveFreeSlot)).toBeInTheDocument();
  });

  it('opens the create-lobby overlay when "New Lobby" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole(ROLES.button, { name: CREATE_MENU_TEXT.triggerName }));
    await user.click(await screen.findByText(CREATE_MENU_TEXT.newLobby));

    expect(useCreateMenuStore.getState().isCreateLobbyOpen).toBe(true);
  });

  it('opens the "event" overlay when "New Event" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole(ROLES.button, { name: CREATE_MENU_TEXT.triggerName }));
    await user.click(await screen.findByText(CREATE_MENU_TEXT.newEvent));

    expect(useCreateMenuStore.getState().overlay).toBe('event');
  });

  it('opens the "task" overlay when "New Task" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole(ROLES.button, { name: CREATE_MENU_TEXT.triggerName }));
    await user.click(await screen.findByText(CREATE_MENU_TEXT.newTask));

    expect(useCreateMenuStore.getState().overlay).toBe('task');
  });

  it('opens the "reserveSlot" overlay when "Reserve Free Slot" is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CreateMenu />);

    await user.click(screen.getByRole(ROLES.button, { name: CREATE_MENU_TEXT.triggerName }));
    await user.click(await screen.findByText(CREATE_MENU_TEXT.reserveFreeSlot));

    expect(useCreateMenuStore.getState().overlay).toBe('reserveSlot');
  });
});
