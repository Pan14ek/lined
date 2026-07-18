import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { LOBBY_TYPE_BADGE_CLASSES, LOBBY_TYPE_LABELS } from './lib/constants';
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

interface LobbyTypeBadgeProps extends VariantProps<typeof lobbyTypeBadgeVariants> {
  type: LobbyType;
  children?: ReactNode;
  className?: string;
}

export const LobbyTypeBadge = ({
  type,
  children = LOBBY_TYPE_LABELS[type],
  size,
  className,
}: LobbyTypeBadgeProps) => {
  return <span className={cn(lobbyTypeBadgeVariants({ type, size }), className)}>{children}</span>;
};
