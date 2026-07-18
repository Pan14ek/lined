import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { LobbyTypeBadge } from '../LobbyTypeBadge';

describe('LobbyTypeBadge', () => {
  it('renders the type label and matching accent classes', () => {
    expect.assertions(2);
    renderWithProviders(<LobbyTypeBadge type="FAMILY" />);

    const badge = screen.getByText('Family');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-lobby-family/10', 'uppercase');
  });

  it('renders custom content with compact styling and merged classes', () => {
    expect.assertions(2);
    renderWithProviders(
      <LobbyTypeBadge type="WORK" size="compact" className="ml-2">
        Team Lined
      </LobbyTypeBadge>,
    );

    const badge = screen.getByText('Team Lined');
    expect(badge).toHaveClass('ml-2', 'text-[10px]', 'bg-lobby-work/10');
    expect(badge).not.toHaveClass('uppercase');
  });
});
