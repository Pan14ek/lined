import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { UserDto } from '@/features/users/model';
import { ROLES, MEMBER_CARD_TEXT } from '@/test/lobbyMemberContent';
import { MemberCard } from '../MemberCard';

const member: UserDto = {
  id: 2,
  username: 'nastia_k',
  email: 'anastasiia@lined.app',
  createdAt: '2025-02-01T12:00:00Z',
  roles: ['ROLE_USER'],
  activePlan: null,
  activeUntil: null,
};

describe('MemberCard', () => {
  it('renders the username, @handle, and "Member since" date', () => {
    expect.assertions(3);
    renderWithProviders(
      <MemberCard
        member={member}
        isOwner={false}
        isCurrentUser={false}
        canManage={false}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText(member.username)).toBeInTheDocument();
    expect(screen.getByText(`@${member.username}`)).toBeInTheDocument();
    expect(screen.getByText('Member since February 2025')).toBeInTheDocument();
  });

  it('shows the Owner badge for the lobby owner', () => {
    expect.assertions(2);
    renderWithProviders(
      <MemberCard
        member={member}
        isOwner={true}
        isCurrentUser={false}
        canManage={false}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText(MEMBER_CARD_TEXT.ownerBadge)).toBeInTheDocument();
    expect(screen.queryByText(MEMBER_CARD_TEXT.memberBadge)).not.toBeInTheDocument();
  });

  it('shows the Member badge for a non-owner', () => {
    expect.assertions(1);
    renderWithProviders(
      <MemberCard
        member={member}
        isOwner={false}
        isCurrentUser={false}
        canManage={false}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText(MEMBER_CARD_TEXT.memberBadge)).toBeInTheDocument();
  });

  it('shows "That\'s you" and hides management actions for the current user', () => {
    expect.assertions(3);
    renderWithProviders(
      <MemberCard
        member={member}
        isOwner={false}
        isCurrentUser={true}
        canManage={true}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText(MEMBER_CARD_TEXT.thatsYou)).toBeInTheDocument();
    expect(
      screen.queryByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }),
    ).not.toBeInTheDocument();
  });

  it('hides "Make owner"/"Remove" actions when the viewer cannot manage members', () => {
    expect.assertions(2);
    renderWithProviders(
      <MemberCard
        member={member}
        isOwner={false}
        isCurrentUser={false}
        canManage={false}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }),
    ).not.toBeInTheDocument();
  });

  it('shows "Make owner"/"Remove" actions for the owner viewing another member', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    const onMakeOwner = vi.fn();
    const onRemove = vi.fn();
    renderWithProviders(
      <MemberCard
        member={member}
        isOwner={false}
        isCurrentUser={false}
        canManage={true}
        onMakeOwner={onMakeOwner}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }));
    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }));

    expect(onMakeOwner).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
