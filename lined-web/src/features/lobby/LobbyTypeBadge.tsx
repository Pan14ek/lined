import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/design-system/data-display/Badge';
import { cn } from '@/lib/utils';
import { LOBBY_TYPE_BADGE_CLASSES } from './lib/constants';
import type { LobbyType } from './model';

const LOBBY_TYPE_I18N_KEY: Record<LobbyType, 'type.couple' | 'type.family' | 'type.friends' | 'type.work'> = {
  COUPLE: 'type.couple',
  FAMILY: 'type.family',
  FRIENDS: 'type.friends',
  WORK: 'type.work',
};

const SIZE_CLASSES = {
  default: 'text-[10px] font-semibold uppercase tracking-wide',
  compact: 'text-[10px] font-medium',
} as const;

interface LobbyTypeBadgeProps {
  type: LobbyType;
  children?: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/**
 * Domain wrapper over the generic `Badge`. Lobby type colors are a fixed
 * domain accent per type (not a generic tone), so they're applied as an
 * explicit className override on top of `Badge`'s pill geometry.
 */
export const LobbyTypeBadge = ({ type, children, size = 'default', className }: LobbyTypeBadgeProps) => {
  const { t } = useTranslation('lobby');
  const content = children ?? t(LOBBY_TYPE_I18N_KEY[type]);
  return (
    <Badge variant="soft" className={cn(LOBBY_TYPE_BADGE_CLASSES[type], SIZE_CLASSES[size], className)}>
      {content}
    </Badge>
  );
};
