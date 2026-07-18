import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { UpcomingEventsList } from '../UpcomingEventsList';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';

describe('UpcomingEventsList', () => {
  it('renders each event with its title, lobby badge, and a "View calendar" link', () => {
    expect.assertions(3);
    renderWithProviders(
      <UpcomingEventsList
        events={MOCK_EVENTS}
        lobbies={MOCK_LOBBIES}
        isLoading={false}
        isError={false}
      />,
    );

    expect(screen.getByText('Morning Coffee')).toBeInTheDocument();
    expect(screen.getAllByText('Alex & Anastasiia').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /view calendar/i })).toHaveAttribute(
      'href',
      '/calendar',
    );
  });

  it('shows a loading skeleton while events are loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <UpcomingEventsList events={undefined} lobbies={undefined} isLoading={true} isError={false} />,
    );

    expect(screen.getByTestId('upcoming-events-loading')).toBeInTheDocument();
  });

  it('shows an empty state when there are no upcoming events', () => {
    expect.assertions(1);
    renderWithProviders(
      <UpcomingEventsList events={[]} lobbies={MOCK_LOBBIES} isLoading={false} isError={false} />,
    );

    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
  });

  it('shows an inline error message when events fail to load', () => {
    expect.assertions(1);
    renderWithProviders(
      <UpcomingEventsList
        events={undefined}
        lobbies={undefined}
        isLoading={false}
        isError={true}
      />,
    );

    expect(screen.getByText(/couldn't load upcoming events/i)).toBeInTheDocument();
  });
});
