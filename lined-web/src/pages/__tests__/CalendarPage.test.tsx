import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { CalendarPage } from '../CalendarPage';
import { useAuthStore } from '@/store/auth';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';

describe('CalendarPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1 });
    useCalendarStore.setState({
      weekStart: useCalendarStore.getState().weekStart,
      monthAnchor: useCalendarStore.getState().monthAnchor,
      viewMode: 'week',
      selectedEventId: null,
      isCreateModalOpen: false,
      hiddenLobbyIds: [],
    });
  });

  it('opens the detail panel, edits an event, and shows the updated title', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(await screen.findByText('Morning Coffee'));
    await user.click(await screen.findByRole('button', { name: 'Edit event' }));
    const titleInput = await screen.findByDisplayValue('Morning Coffee');
    await user.clear(titleInput);
    await user.type(titleInput, 'Espresso Run');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(
      () => expect(screen.getAllByText('Espresso Run').length).toBeGreaterThan(0),
      { timeout: 3000 },
    );
  });

  it('switches to month view and renders a day-of-week header', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: 'Month' }));

    expect(await screen.findByText('Mon')).toBeInTheDocument();
  });

  it('switches back to week view when a month-grid day is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: 'Month' }));
    await screen.findByText('Mon');
    // Click the day cell containing today's date to drill into its week
    // (scoped to the day-number badge, not the topbar's active "Month" toggle).
    const todayCell = document.querySelector('.h-5.w-5.bg-brand-green')?.closest('button');
    expect(todayCell).not.toBeNull();
    if (todayCell) await user.click(todayCell);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Week' })).toHaveClass('bg-brand-green'),
    );
  });

  it('opens the reserve-slot overlay without a lobbyId when a free-slot band is clicked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    const [band] = await screen.findAllByRole('button', { name: /reserve this free slot/i });
    await user.click(band!);

    expect(useCreateMenuStore.getState().overlay).toBe('reserveSlot');
    expect(useCreateMenuStore.getState().reserveSlotInitial?.lobbyId).toBeUndefined();
  });

  it('opens the day agenda panel listing that day\'s events when a day header is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee');

    const todayLabel = `${new Date().toLocaleDateString('en-US', { weekday: 'short' })} ${new Date().getDate()}`;
    await user.click(screen.getByRole('button', { name: todayLabel }));

    expect(await screen.findAllByText('Morning Coffee')).toHaveLength(2); // grid event + agenda row
  });

  it('selects the event and shows its detail panel when an agenda row is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee');

    const todayLabel = `${new Date().toLocaleDateString('en-US', { weekday: 'short' })} ${new Date().getDate()}`;
    await user.click(screen.getByRole('button', { name: todayLabel }));

    const [, agendaRow] = await screen.findAllByText('Morning Coffee');
    await user.click(agendaRow!);

    expect(await screen.findByRole('button', { name: 'Edit event' })).toBeInTheDocument();
  });

  it('hides a lobby\'s events from the grid when it is unchecked in the Filters dropdown', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await screen.findByText('Morning Coffee'); // lobby 1 (Alex & Anastasiia)

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Alex & Anastasiia/ }));

    await waitFor(() => expect(screen.queryByText('Morning Coffee')).not.toBeInTheDocument());
    expect(screen.getByText('Team Lunch')).toBeInTheDocument(); // a different lobby, still visible
  });

  it('reflects a hidden lobby as unchecked and re-shows its events once re-checked', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    useCalendarStore.setState({ hiddenLobbyIds: [1] });
    renderWithProviders(<CalendarPage />);

    await waitFor(() => expect(screen.queryByText('Morning Coffee')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: /filters/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Alex & Anastasiia/ }));

    expect(await screen.findByText('Morning Coffee')).toBeInTheDocument();
  });
});
