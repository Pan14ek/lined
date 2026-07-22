import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { LOBBY_TYPE_BADGE_CLASSES } from './lib/constants';
import type { LobbyType } from './model';

const lobbyTypeBadgeVariants = cva('', {
  variants: {
    type: LOBBY_TYPE_BADGE_CLASSES,
    size: {
      default: 'w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
      compact: 'rounded-full px-2 py-0.5 text-[10px] font-medium',
    },
  },
  defaultVariants: { size: 'default' },
});

const LOBBY_TYPE_I18N_KEY: Record<LobbyType, 'type.couple' | 'type.family' | 'type.friends' | 'type.work'> = {
  COUPLE: 'type.couple',
  FAMILY: 'type.family',
  FRIENDS: 'type.friends',
  WORK: 'type.work',
};

interface LobbyTypeBadgeProps extends VariantProps<typeof lobbyTypeBadgeVariants> {
  type: LobbyType;
  children?: ReactNode;
  className?: string;
}

export const LobbyTypeBadge = ({
  type,
  children,
  size,
  className,
}: LobbyTypeBadgeProps) => {
  const { t } = useTranslation('lobby');
  const content = children ?? t(LOBBY_TYPE_I18N_KEY[type]);
  return <span className={cn(lobbyTypeBadgeVariants({ type, size }), className)}>{content}</span>;
};
