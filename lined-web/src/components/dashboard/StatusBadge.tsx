import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_LABELS } from '@/lib/constants';
import type { TaskStatus } from '@/types';

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TASK_STATUS_BADGE_CLASSES[status]}`}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
