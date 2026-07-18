import type { UserDto } from '@/features/users/model';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AssigneeAvatarProps {
  assignee: UserDto | undefined;
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
      <AvatarFallback className={`bg-brand-green font-semibold text-white ${fallbackTextClassName}`}>
        {assignee.username.charAt(0).toUpperCase()}
      </AvatarFallback>
    ) : (
      <AvatarFallback className={`bg-gray-300 font-semibold text-white ${fallbackTextClassName}`}>
        ?
      </AvatarFallback>
    )}
  </Avatar>
);
