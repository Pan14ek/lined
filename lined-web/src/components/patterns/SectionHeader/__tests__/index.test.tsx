import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { SectionHeader } from '..';

describe('SectionHeader', () => {
  it('renders the title as a heading', () => {
    expect.assertions(1);
    renderWithProviders(<SectionHeader title="Upcoming events" />);

    expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument();
  });

  it('renders the description and action when provided', () => {
    expect.assertions(2);
    renderWithProviders(
      <SectionHeader
        title="My tasks"
        description="Tasks assigned to you"
        action={<a href="/tasks">View all</a>}
      />,
    );

    expect(screen.getByText('Tasks assigned to you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument();
  });
});
