import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SKELETON_BONE_CLASS } from './boneClass';

interface SkeletonAvatarProps {
  className?: string;
  /** Overrides the bone color, e.g. for a dark-background container like the sidebar. */
  boneClassName?: string;
  testId?: string;
}

export const SkeletonAvatar = ({ className, boneClassName, testId }: SkeletonAvatarProps) => {
  const bone = boneClassName ?? SKELETON_BONE_CLASS;
  return (
    <div className={cn('flex items-center gap-3', className)} data-testid={testId}>
      <Skeleton className={cn('size-9 shrink-0 rounded-full', bone)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className={cn('h-3 w-24 rounded', bone)} />
        <Skeleton className={cn('h-3 w-32 rounded', bone)} />
      </div>
    </div>
  );
}
