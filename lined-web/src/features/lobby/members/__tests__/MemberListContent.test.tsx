import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import type { LobbyDto } from '@/features/lobby/model';
import type { UserDto } from '@/features/users/model';
import { MemberListContent } from '../MemberListContent';

const lobby: LobbyDto = {
  id: 1,
  name: 'Alex & Anastasiia',
  lobbyType: 'COUPLE',
  ownerId: 1,
  memberIds: [1, 2],
};

const alex: UserDto = {
  id: 1,
  username: 'alex_johnson',
  email: 'alex@lined.app',
  createdAt: '2025-01-15T10:00:00Z',
  roles: ['ROLE_USER'],
  activePlan: null,
  activeUntil: null,
};

const nastia: UserDto = {
  id: 2,
  username: 'nastia_k',
  email: 'anastasiia@lined.app',
  createdAt: '2025-02-01T12:00:00Z',
  roles: ['ROLE_USER'],
  activePlan: null,
  activeUntil: null,
};

const makeQuery = (data: UserDto | undefined, overrides = {}) => ({
  data,
  isLoading: false,
  isError: false,
  ...overrides,
});

describe('MemberListContent', () => {
  it('renders one card per member', () => {
    expect.assertions(2);
    renderWithProviders(
      <MemberListContent
        memberQueries={[makeQuery(alex), makeQuery(nastia)] as never}
        lobby={lobby}
        currentUserId={1}
        isOwnerViewer={true}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('alex_johnson')).toBeInTheDocument();
    expect(screen.getByText('nastia_k')).toBeInTheDocument();
  });

  it('shows a loading skeleton while any member query is loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <MemberListContent
        memberQueries={[makeQuery(undefined, { isLoading: true })] as never}
        lobby={lobby}
        currentUserId={1}
        isOwnerViewer={true}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByTestId('lobby-members-loading')).toBeInTheDocument();
  });

  it('shows an error message when any member query fails', () => {
    expect.assertions(1);
    renderWithProviders(
      <MemberListContent
        memberQueries={[makeQuery(undefined, { isError: true })] as never}
        lobby={lobby}
        currentUserId={1}
        isOwnerViewer={true}
        onMakeOwner={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Couldn't load members. Try again later.")).toBeInTheDocument();
  });

  it('calls onRemove for the clicked member', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(
      <MemberListContent
        memberQueries={[makeQuery(nastia)] as never}
        lobby={{ ...lobby, memberIds: [2] }}
        currentUserId={1}
        isOwnerViewer={true}
        onMakeOwner={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemove).toHaveBeenCalledWith(nastia);
  });
});
