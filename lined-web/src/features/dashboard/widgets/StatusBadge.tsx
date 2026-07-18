import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_LABELS } from '@/features/tasks/lib/constants';
import type { TaskStatus } from '@/features/tasks/model';

interface StatusBadgeProps {
  status: TaskStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TASK_STATUS_BADGE_CLASSES[status]}`}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
