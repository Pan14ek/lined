import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import type { UserPageDto } from '@/features/users/model';
import { SearchResultsList } from '../SearchResultsList';

const results: UserPageDto = {
  content: [
    {
      id: 3,
      username: 'nastia_bondar',
      email: 'nastia.bondar@lined.app',
      createdAt: '2025-06-10T09:00:00Z',
      roles: ['ROLE_USER'],
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const baseProps = {
  debouncedQuery: 'nastia',
  isLoading: false,
  isError: false,
  memberIds: [],
  invitedIds: new Set<number>(),
  sendingId: null,
  rowErrors: {},
  onInvite: vi.fn(),
};

describe('SearchResultsList', () => {
  it('renders a row per matching user', () => {
    expect.assertions(1);
    renderWithProviders(<SearchResultsList {...baseProps} results={results} />);

    expect(screen.getByText('nastia_bondar')).toBeInTheDocument();
  });

  it('shows a loading skeleton while searching', () => {
    expect.assertions(1);
    renderWithProviders(<SearchResultsList {...baseProps} isLoading results={undefined} />);

    expect(screen.getByTestId('add-member-search-loading')).toBeInTheDocument();
  });

  it('shows an error message when the search fails', () => {
    expect.assertions(1);
    renderWithProviders(<SearchResultsList {...baseProps} isError results={undefined} />);

    expect(screen.getByText('Search failed — try again.')).toBeInTheDocument();
  });

  it('shows "No users found." for an empty result set', () => {
    expect.assertions(1);
    renderWithProviders(
      <SearchResultsList {...baseProps} results={{ ...results, content: [], totalElements: 0 }} />,
    );

    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('shows nothing extra below the minimum query length', () => {
    expect.assertions(1);
    renderWithProviders(<SearchResultsList {...baseProps} debouncedQuery="n" results={undefined} />);

    expect(screen.queryByText('No users found.')).not.toBeInTheDocument();
  });
});
