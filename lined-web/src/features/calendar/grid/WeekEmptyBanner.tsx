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

export const WeekEmptyBanner = ({ message, action }: WeekEmptyBannerProps) => {
  return (
    <div className="px-6 pt-4">
      <EmptyState icon="📅" message={message} action={action} />
    </div>
  );
}
