import { useTranslation } from 'react-i18next';
import type { UserPageDto } from '@/features/users/model';
import { SkeletonRow } from '@/components/skeletons/SkeletonRow';
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
  const { t } = useTranslation('lobby');
  const hasQuery = debouncedQuery.length >= 2;

  if (isLoading && hasQuery) {
    return (
      <div className="flex flex-col gap-2" data-testid="add-member-search-loading">
        {[0, 1].map((i) => (
          <SkeletonRow key={i} className="h-12 bg-surface-hover" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-text-secondary">{t('search.searchFailed')}</p>;
  }

  if (hasQuery && results?.content.length === 0) {
    return <p className="text-sm text-text-secondary">{t('search.noUsersFound')}</p>;
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
