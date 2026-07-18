import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { WeekEmptyBanner } from '../WeekEmptyBanner';

describe('WeekEmptyBanner', () => {
  it('renders the message and calls onClick when the action button is clicked', async () => {
    expect.assertions(2);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <WeekEmptyBanner
        message="No events this week — create one."
        action={{ label: 'Create event', onClick }}
      />,
    );

    expect(screen.getByText('No events this week — create one.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a router Link when the action has a "to" target', () => {
    expect.assertions(1);
    renderWithProviders(
      <WeekEmptyBanner message="No events yet." action={{ label: 'Invite someone', to: '/lobbies/1?tab=members' }} />,
    );

    expect(screen.getByRole('link', { name: 'Invite someone' })).toHaveAttribute(
      'href',
      '/lobbies/1?tab=members',
    );
  });
});
