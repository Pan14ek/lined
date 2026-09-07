import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from '@/components/design-system/data-display/Badge';
import { cn } from '@/lib/utils';
import type { TaskStatus } from './model';

/** Maps a task status to the closest generic Badge tone — todo is neutral, in-progress/done are the semantic info/success states. */
const TASK_STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
};

const SIZE_CLASSES = {
  default: 'text-[10px] font-semibold uppercase tracking-wide',
  count: 'text-[11px] font-semibold',
} as const;

interface TaskStatusBadgeProps {
  status: TaskStatus;
  children?: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/** Domain wrapper mapping a task status to the generic `Badge`'s tone/geometry. */
export const TaskStatusBadge = ({ status, children, size = 'default', className }: TaskStatusBadgeProps) => {
  const { t } = useTranslation('tasks');
  const label = children ?? t(`status.${status}`);
  return (
    <Badge tone={TASK_STATUS_TONE[status]} variant="soft" className={cn(SIZE_CLASSES[size], className)}>
      {label}
    </Badge>
  );
};
