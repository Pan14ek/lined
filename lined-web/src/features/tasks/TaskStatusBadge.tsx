import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_LABELS } from './lib/constants';
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
  children = TASK_STATUS_LABELS[status],
  size,
  className,
}: TaskStatusBadgeProps) => {
  return <span className={cn(taskStatusBadgeVariants({ status, size }), className)}>{children}</span>;
};
