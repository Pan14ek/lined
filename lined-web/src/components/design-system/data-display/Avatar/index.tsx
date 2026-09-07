import {
  Avatar as AvatarPrimitive,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarTone = 'neutral' | 'brand';

const SIZE_MAP: Record<AvatarSize, 'sm' | 'default' | 'lg'> = {
  xs: 'sm',
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  xl: 'lg',
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-xs',
  md: 'size-8 text-sm',
  lg: 'size-10 text-base',
  xl: 'size-12 text-lg',
};

const TONE_CLASSES: Record<AvatarTone, string> = {
  neutral: 'bg-muted-foreground text-white',
  brand: 'bg-primary text-primary-foreground',
};

export interface AvatarProps {
  /** Image URL. Falls back to the initial(s) in `fallback` when unset or failing to load. */
  src?: string;
  alt?: string;
  /** Text shown when there is no image (typically one or two initials). */
  fallback: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  className?: string;
}

/**
 * Purpose: generic circular avatar with an image + text-fallback contract.
 *
 * When to use: representing a person or entity by picture/initial.
 *
 * When not to use: this component has no notion of a user/domain model —
 * feature code should wrap it (e.g. `UserAvatar`) to map a DTO to `src`/`fallback`.
 */
export const Avatar = ({ src, alt, fallback, size = 'md', tone = 'neutral', className }: AvatarProps) => {
  return (
    <AvatarPrimitive size={SIZE_MAP[size]} className={cn(SIZE_CLASSES[size], className)}>
      {src && <AvatarImage src={src} alt={alt ?? ''} />}
      <AvatarFallback className={cn('font-semibold', TONE_CLASSES[tone])}>{fallback}</AvatarFallback>
    </AvatarPrimitive>
  );
};
