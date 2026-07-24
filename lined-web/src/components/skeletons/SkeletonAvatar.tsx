import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonAvatarProps {
  className?: string;
  testId?: string;
}

export const SkeletonAvatar = ({ className, testId }: SkeletonAvatarProps) => {
  return (
    <div className={cn('flex items-center gap-3', className)} data-testid={testId}>
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
    </div>
  );
}
