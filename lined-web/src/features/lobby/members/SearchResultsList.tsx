import type { UserPageDto } from '@/features/users/model';
import { SearchResultRow } from './SearchResultRow';

interface SearchResultsListProps {
  debouncedQuery: string;
  isLoading: boolean;
  isError: boolean;
  results: UserPageDto | undefined;
  memberIds: number[];
  invitedIds: Set<number>;
  sendingId: number | null;
  rowErrors: Record<number, string>;
  onInvite: (userId: number) => void;
}

export const SearchResultsList = ({
  debouncedQuery,
  isLoading,
  isError,
  results,
  memberIds,
  invitedIds,
  sendingId,
  rowErrors,
  onInvite,
}: SearchResultsListProps) => {
  const hasQuery = debouncedQuery.length >= 2;

  if (isLoading && hasQuery) {
    return (
      <div className="flex flex-col gap-2" data-testid="add-member-search-loading">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-text-secondary">Search failed — try again.</p>;
  }

  if (hasQuery && results?.content.length === 0) {
    return <p className="text-sm text-text-secondary">No users found.</p>;
  }

  return (
    <>
      {results?.content.map((user) => (
        <SearchResultRow
          key={user.id}
          user={user}
          isMember={memberIds.includes(user.id)}
          isInvited={invitedIds.has(user.id)}
          isSending={sendingId === user.id}
          error={rowErrors[user.id]}
          onInvite={() => onInvite(user.id)}
        />
      ))}
    </>
  );
};
