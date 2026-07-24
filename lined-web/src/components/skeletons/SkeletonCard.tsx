import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SKELETON_BONE_CLASS } from './boneClass';

interface SkeletonCardProps {
  className?: string;
  testId?: string;
}

export const SkeletonCard = ({ className, testId }: SkeletonCardProps) => {
  return (
    <Skeleton
      className={cn('h-24 w-full rounded-xl', SKELETON_BONE_CLASS, className)}
      data-testid={testId}
    />
  );
}
