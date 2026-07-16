import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { HTTPError } from 'ky';
import type { LobbyDto } from '@/types';
import { useUserSearch } from '@/hooks/useUsers';
import { useCreateInvite } from '@/hooks/useInvites';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SearchResultsList } from './SearchResultsList';

interface AddMemberModalProps {
  lobby: LobbyDto;
  onClose: () => void;
}

export const AddMemberModal = ({ lobby, onClose }: AddMemberModalProps) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const { data: results, isLoading, isError } = useUserSearch(debouncedQuery);
  const createInvite = useCreateInvite(lobby.id);

  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const handleInvite = (userId: number) => {
    setSendingId(userId);
    setRowErrors((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    createInvite.mutate(
      { userId },
      {
        onSuccess: () => {
          setInvitedIds((prev) => new Set(prev).add(userId));
        },
        onError: (error) => {
          const message =
            error instanceof HTTPError && error.response.status === 409
              ? 'Already a member or already invited'
              : "Couldn't send invite — try again";
          setRowErrors((prev) => ({ ...prev, [userId]: message }));
        },
        onSettled: () => setSendingId(null),
      },
    );
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-[460px] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-text-primary">Add Member</h2>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 text-xs text-text-secondary">
            Search by username or email to invite someone to <strong>{lobby.name}</strong>.
          </p>

          <label htmlFor="add-member-search" className="mb-1.5 block text-xs font-medium text-text-secondary">
            Search user
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              id="add-member-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Username or email"
              className="h-12 w-full rounded-lg border border-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
            />
          </div>

          <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
            {query.trim().length > 0 && query.trim().length < 2 && (
              <p className="text-xs text-text-muted">Type at least 2 characters to search.</p>
            )}

            <SearchResultsList
              debouncedQuery={debouncedQuery}
              isLoading={isLoading}
              isError={isError}
              results={results}
              memberIds={lobby.memberIds}
              invitedIds={invitedIds}
              sendingId={sendingId}
              rowErrors={rowErrors}
              onInvite={handleInvite}
            />
          </div>

          <div className="mt-4 rounded-lg bg-bg px-3.5 py-3 text-xs text-text-secondary">
            💡 You can also share an invite link: <span className="font-semibold text-brand-green">lined.app/invite/abc123</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-border bg-white px-4 text-sm text-text-secondary hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
