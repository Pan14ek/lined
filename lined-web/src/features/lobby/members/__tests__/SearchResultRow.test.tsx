import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { UserSearchResultDto } from '@/features/users/model';
import { SearchResultRow } from '../SearchResultRow';

const user: UserSearchResultDto = {
  id: 3,
  username: 'nastia_bondar',
};

describe('SearchResultRow', () => {
  it('shows an "Invite" button for a non-member and calls onInvite when clicked', async () => {
    expect.assertions(1);
    const onInvite = vi.fn();
    const clickUser = userEvent.setup();
    renderWithProviders(
      <SearchResultRow
        user={user}
        isMember={false}
        isInvited={false}
        isSending={false}
        onInvite={onInvite}
      />,
    );

    await clickUser.click(screen.getByRole('button', { name: 'Invite' }));

    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('shows a checkmark and no invite button for an existing member', () => {
    expect.assertions(2);
    renderWithProviders(
      <SearchResultRow
        user={user}
        isMember={true}
        isInvited={false}
        isSending={false}
        onInvite={vi.fn()}
      />,
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables and relabels the button once already invited', () => {
    expect.assertions(2);
    renderWithProviders(
      <SearchResultRow
        user={user}
        isMember={false}
        isInvited={true}
        isSending={false}
        onInvite={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: 'Invite sent' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows a row-level error message', () => {
    expect.assertions(1);
    renderWithProviders(
      <SearchResultRow
        user={user}
        isMember={false}
        isInvited={false}
        isSending={false}
        error="Already a member or already invited"
        onInvite={vi.fn()}
      />,
    );

    expect(screen.getByText('Already a member or already invited')).toBeInTheDocument();
  });
});
