import { EmptyState } from '@/components/patterns/EmptyState';

interface WeekEmptyBannerAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

interface WeekEmptyBannerProps {
  message: string;
  action: WeekEmptyBannerAction;
}

export const WeekEmptyBanner = ({ message, action }: WeekEmptyBannerProps) => {
  return (
    <div className="px-6 pt-4">
      <EmptyState icon="📅" title={message} action={action} />
    </div>
  );
}
