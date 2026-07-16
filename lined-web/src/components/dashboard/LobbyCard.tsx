import { Link } from 'react-router-dom';
import { Users, Calendar, CheckSquare } from 'lucide-react';
import type { LobbyDto } from '@/types';
import {
  LOBBY_TYPE_BADGE_CLASSES,
  LOBBY_TYPE_COLORS,
  LOBBY_TYPE_LABELS,
} from '@/lib/constants';

interface LobbyCardProps {
  lobby: LobbyDto;
  eventCount: number;
  taskCount: number;
}

export function LobbyCard({ lobby, eventCount, taskCount }: LobbyCardProps) {
  return (
    <Link
      to={`/lobbies/${lobby.id}`}
      className="flex w-56 flex-shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className={`h-1.5 w-full ${LOBBY_TYPE_COLORS[lobby.lobbyType]}`} />
      <div className="flex flex-col gap-2 p-4">
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LOBBY_TYPE_BADGE_CLASSES[lobby.lobbyType]}`}
        >
          {LOBBY_TYPE_LABELS[lobby.lobbyType]}
        </span>
        <p className="truncate text-sm font-semibold text-text-primary">{lobby.name}</p>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {lobby.memberIds.length}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {eventCount}
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {taskCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
