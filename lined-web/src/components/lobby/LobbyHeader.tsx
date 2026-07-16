import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LobbyDto } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LOBBY_TYPE_BADGE_CLASSES,
  LOBBY_TYPE_BORDER_CLASSES,
  LOBBY_TYPE_ICONS,
  LOBBY_TYPE_LABELS,
} from '@/lib/constants';
import { useUsers } from '@/hooks/useUsers';
import { AddMemberModal } from './AddMemberModal';

const MAX_AVATARS_SHOWN = 4;

interface LobbyHeaderProps {
  lobby: LobbyDto;
}

export const LobbyHeader = ({ lobby }: LobbyHeaderProps) => {
  const memberQueries = useUsers(lobby.memberIds);
  const shown = memberQueries.slice(0, MAX_AVATARS_SHOWN);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  return (
    <div className={`border-t-4 bg-white ${LOBBY_TYPE_BORDER_CLASSES[lobby.lobbyType]}`}>
      <div className="flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
            {LOBBY_TYPE_ICONS[lobby.lobbyType]}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{lobby.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex -space-x-2" data-testid="lobby-member-avatars">
                {shown.map((query, i) => (
                  <Avatar key={lobby.memberIds[i]} size="sm" className="ring-2 ring-white">
                    {query.isLoading && (
                      <AvatarFallback className="animate-pulse bg-gray-200" />
                    )}
                    {!query.isLoading && query.data && (
                      <AvatarFallback className="bg-brand-green text-xs font-semibold text-white">
                        {query.data.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                    {!query.isLoading && !query.data && (
                      <AvatarFallback className="bg-gray-300 text-xs font-semibold text-white">
                        ?
                      </AvatarFallback>
                    )}
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-text-secondary">
                {lobby.memberIds.length} member{lobby.memberIds.length === 1 ? '' : 's'}
              </span>
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LOBBY_TYPE_BADGE_CLASSES[lobby.lobbyType]}`}
              >
                {LOBBY_TYPE_LABELS[lobby.lobbyType]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(true)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-gray-50"
          >
            + Add member
          </button>
          <Link
            to={`/lobbies/${lobby.id}/settings`}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-gray-50"
          >
            ⚙ Settings
          </Link>
        </div>
      </div>

      {isAddMemberOpen && (
        <AddMemberModal lobby={lobby} onClose={() => setIsAddMemberOpen(false)} />
      )}
    </div>
  );
};
