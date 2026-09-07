import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import type { UserDto } from '@/features/users/model';
import { UserAvatar } from '../UserAvatar';

const user: UserDto = {
  id: 1,
  username: 'alex_johnson',
  email: 'alex@lined.app',
  createdAt: '2025-01-15T10:00:00Z',
  roles: ['ROLE_USER'],
  activePlan: null,
  activeUntil: null,
};

describe('UserAvatar', () => {
  it("shows the user's uppercased first initial", () => {
    expect.assertions(1);
    renderWithProviders(<UserAvatar user={user} />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows a "?" placeholder when there is no user', () => {
    expect.assertions(1);
    renderWithProviders(<UserAvatar user={undefined} />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
