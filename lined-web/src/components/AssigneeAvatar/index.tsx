import type { UserPublicDto } from '@/features/users/model';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AssigneeAvatarProps {
  assignee: UserPublicDto | undefined;
  size?: 'default' | 'sm' | 'lg';
  fallbackTextClassName?: string;
}

/** Circular avatar showing an assignee's initial, or "?" when unassigned. */
export const AssigneeAvatar = ({
  assignee,
  size = 'default',
  fallbackTextClassName = 'text-xs',
}: AssigneeAvatarProps) => (
  <Avatar size={size}>
    {assignee ? (
      <AvatarFallback className={cn('bg-brand-green font-semibold text-white', fallbackTextClassName)}>
        {assignee.username.charAt(0).toUpperCase()}
      </AvatarFallback>
    ) : (
      <AvatarFallback className={cn('bg-muted-foreground font-semibold text-white', fallbackTextClassName)}>
        ?
      </AvatarFallback>
    )}
  </Avatar>
);
