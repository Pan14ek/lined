import type { UserDto } from './model';
import { Avatar, type AvatarSize } from '@/components/design-system/data-display/Avatar';

interface UserAvatarProps {
  user: UserDto | undefined;
  size?: AvatarSize;
  className?: string;
}

/** Circular avatar showing a user's initial, or "?" when unassigned. Thin domain wrapper over the generic `Avatar`. */
export const UserAvatar = ({ user, size = 'md', className }: UserAvatarProps) => (
  <Avatar
    fallback={user ? user.username.charAt(0).toUpperCase() : '?'}
    tone={user ? 'brand' : 'neutral'}
    size={size}
    className={className}
  />
);
