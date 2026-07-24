import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SKELETON_BONE_CLASS } from './boneClass';

interface SkeletonRowProps {
  className?: string;
  testId?: string;
}

export const SkeletonRow = ({ className, testId }: SkeletonRowProps) => {
  return (
    <Skeleton
      className={cn('h-14 w-full rounded-lg', SKELETON_BONE_CLASS, className)}
      data-testid={testId}
    />
  );
}
