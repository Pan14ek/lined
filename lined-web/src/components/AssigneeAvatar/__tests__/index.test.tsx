import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import type { UserDto } from '@/features/users/model';
import { AssigneeAvatar } from '..';

const assignee: UserDto = {
  id: 1,
  username: 'alex_johnson',
  email: 'alex@lined.app',
  createdAt: '2025-01-15T10:00:00Z',
  roles: ['ROLE_USER'],
  activePlan: null,
  activeUntil: null,
};

describe('AssigneeAvatar', () => {
  it('shows the assignee\'s uppercased first initial', () => {
    expect.assertions(1);
    renderWithProviders(<AssigneeAvatar assignee={assignee} />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows a "?" placeholder when there is no assignee', () => {
    expect.assertions(1);
    renderWithProviders(<AssigneeAvatar assignee={undefined} />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('applies a custom fallback text class name', () => {
    expect.assertions(1);
    renderWithProviders(<AssigneeAvatar assignee={assignee} fallbackTextClassName="text-lg" />);

    expect(screen.getByText('A')).toHaveClass('text-lg');
  });
});
