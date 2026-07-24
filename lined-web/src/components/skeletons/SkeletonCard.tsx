import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  testId?: string;
}

export const SkeletonCard = ({ className, testId }: SkeletonCardProps) => {
  return <Skeleton className={cn('h-24 w-full rounded-xl', className)} data-testid={testId} />;
}
