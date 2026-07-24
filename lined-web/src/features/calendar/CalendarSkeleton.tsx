import { Skeleton } from '@/components/ui/skeleton';

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
          <Skeleton key={day} className="h-8 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-1 gap-2">
        {days.map((day) => (
          <div key={day} className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
