import { EmptyState } from '@/components/EmptyState';

interface WeekEmptyBannerAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

interface WeekEmptyBannerProps {
  message: string;
  action: WeekEmptyBannerAction;
}

/** Shown above the week grid when the visible week has zero events. */
export function WeekEmptyBanner({ message, action }: WeekEmptyBannerProps) {
  return (
    <div className="px-6 pt-4">
      <EmptyState icon="📅" message={message} action={action} />
    </div>
  );
}
