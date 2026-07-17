import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { CalendarPage } from '../CalendarPage';
import { useAuthStore } from '@/store/auth';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';

describe('CalendarPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 1, token: 'token' });
    useCalendarStore.setState({
      weekStart: useCalendarStore.getState().weekStart,
      monthAnchor: useCalendarStore.getState().monthAnchor,
      viewMode: 'week',
      selectedEventId: null,
      isCreateModalOpen: false,
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
});
