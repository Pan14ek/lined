import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { TopBar } from '../TopBar';

describe('TopBar', () => {
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
