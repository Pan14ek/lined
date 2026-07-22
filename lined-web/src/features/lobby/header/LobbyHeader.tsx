import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LobbyDto } from '@/features/lobby/model';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LOBBY_TYPE_BORDER_CLASSES, LOBBY_TYPE_ICONS } from '@/features/lobby/lib/constants';
import { LobbyTypeBadge } from '@/features/lobby/LobbyTypeBadge';
import { useUsers } from '@/features/users/hooks/useUsers';
import { AddMemberModal } from '../members/AddMemberModal';
import { cn } from '@/lib/utils';

const MAX_AVATARS_SHOWN = 4;

interface LobbyHeaderProps {
  lobby: LobbyDto;
}

export const LobbyHeader = ({ lobby }: LobbyHeaderProps) => {
  const { t } = useTranslation('lobby');
  const memberQueries = useUsers(lobby.memberIds);
  const shown = memberQueries.slice(0, MAX_AVATARS_SHOWN);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  return (
    <div className={cn('border-t-4 bg-surface', LOBBY_TYPE_BORDER_CLASSES[lobby.lobbyType])}>
      <div className="flex flex-col items-start gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-surface-hover text-2xl">
            {LOBBY_TYPE_ICONS[lobby.lobbyType]}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{lobby.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex -space-x-2" data-testid="lobby-member-avatars">
                {shown.map((query, i) => (
                  <Avatar key={lobby.memberIds[i]} size="sm" className="ring-2 ring-surface">
                    {query.isLoading && (
                      <AvatarFallback className="animate-pulse bg-muted" />
                    )}
                    {!query.isLoading && query.data && (
                      <AvatarFallback className="bg-brand-green text-xs font-semibold text-white">
                        {query.data.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                    {!query.isLoading && !query.data && (
                      <AvatarFallback className="bg-muted-foreground text-xs font-semibold text-white">
                        ?
                      </AvatarFallback>
                    )}
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-text-secondary">
                {t('header.memberCount', { count: lobby.memberIds.length })}
              </span>
              <LobbyTypeBadge type={lobby.lobbyType} />
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(true)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
          >
            {t('header.addMember')}
          </button>
          <Link
            to={`/lobbies/${lobby.id}/settings`}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
          >
            {t('header.settings')}
          </Link>
        </div>
      </div>

      {isAddMemberOpen && (
        <AddMemberModal lobby={lobby} onClose={() => setIsAddMemberOpen(false)} />
      )}
    </div>
  );
};
