import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { TASK_STATUS_BADGE_CLASSES } from './lib/constants';
import type { TaskStatus } from './model';

const taskStatusBadgeVariants = cva('', {
  variants: {
    status: TASK_STATUS_BADGE_CLASSES,
    size: {
      default: 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
      count: 'rounded-full px-2 py-0.5 text-[11px] font-semibold',
    },
  },
  defaultVariants: { size: 'default' },
});

interface TaskStatusBadgeProps extends VariantProps<typeof taskStatusBadgeVariants> {
  status: TaskStatus;
  children?: ReactNode;
  className?: string;
}

export const TaskStatusBadge = ({
  status,
  children,
  size,
  className,
}: TaskStatusBadgeProps) => {
  const { t } = useTranslation('tasks');
  const label = children ?? t(`status.${status}`);
  return <span className={cn(taskStatusBadgeVariants({ status, size }), className)}>{label}</span>;
};
