import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/utils';
import { BottomTabBar } from '../BottomTabBar';

const renderBar = (initialEntries: string[]) =>
  renderWithProviders(
    <Routes>
      <Route path="*" element={<BottomTabBar />} />
    </Routes>,
    { initialEntries },
  );

describe('BottomTabBar', () => {
  it('renders a nav item for each of Dashboard, Calendar and Tasks', () => {
    expect.assertions(3);
    renderBar(['/']);

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
  });

  it('marks the current route active via aria-current', () => {
    expect.assertions(2);
    renderBar(['/calendar']);

    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current');
  });

  it('links to the calendar and tasks routes', () => {
    expect.assertions(2);
    renderBar(['/']);

    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: /tasks/i })).toHaveAttribute('href', '/tasks');
  });
});
