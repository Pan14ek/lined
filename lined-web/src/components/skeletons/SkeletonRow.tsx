import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonRowProps {
  className?: string;
  testId?: string;
}

export const SkeletonRow = ({ className, testId }: SkeletonRowProps) => {
  return <Skeleton className={cn('h-14 w-full rounded-lg', className)} data-testid={testId} />;
}
