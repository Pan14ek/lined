import { Skeleton } from '@/components/ui/skeleton';
import { SKELETON_BONE_CLASS } from '@/components/skeletons/boneClass';
import { cn } from '@/lib/utils';

interface CalendarSkeletonProps {
  dayCount?: number;
  testId?: string;
}

/** Grid-shaped placeholder shown while a week/month/day event range is loading. */
export const CalendarSkeleton = ({ dayCount = 7, testId }: CalendarSkeletonProps) => {
  const days = Array.from({ length: dayCount }, (_, i) => i);

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4" data-testid={testId}>
      <div className="mb-3 flex gap-2">
        {days.map((day) => (
          <Skeleton key={day} className={cn('h-8 flex-1 rounded-lg', SKELETON_BONE_CLASS)} />
        ))}
      </div>
      <div className="flex flex-1 gap-2">
        {days.map((day) => (
          <div key={day} className="flex flex-1 flex-col gap-2">
            <Skeleton className={cn('h-16 rounded-lg', SKELETON_BONE_CLASS)} />
            <Skeleton className={cn('h-24 rounded-lg', SKELETON_BONE_CLASS)} />
            <Skeleton className={cn('h-12 rounded-lg', SKELETON_BONE_CLASS)} />
          </div>
        ))}
      </div>
    </div>
  );
}
