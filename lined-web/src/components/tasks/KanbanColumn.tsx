import { useState } from 'react';
import type { DragEvent } from 'react';
import type { LobbyDto, TaskDto, TaskStatus, UserDto } from '@/types';
import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/constants';
import { KanbanCard, TASK_DRAG_DATA_FORMAT } from './KanbanCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskDto[];
  lobbiesById: Map<number, LobbyDto>;
  assigneesById: Map<number, UserDto | undefined>;
  movingTaskId: number | null;
  moveErrors: Record<number, string>;
  onMove: (task: TaskDto, direction: 'prev' | 'next') => void;
  onDelete: (task: TaskDto) => void;
  onQuickAdd: (status: TaskStatus) => void;
  onDropTask: (taskId: number, status: TaskStatus) => void;
}

export const KanbanColumn = ({
  status,
  tasks,
  lobbiesById,
  assigneesById,
  movingTaskId,
  moveErrors,
  onMove,
  onDelete,
  onQuickAdd,
  onDropTask,
}: KanbanColumnProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_DATA_FORMAT)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = Number(e.dataTransfer.getData(TASK_DRAG_DATA_FORMAT));
    if (taskId) onDropTask(taskId, status);
  };

  return (
    <div
      className={`flex min-w-[280px] flex-1 flex-col rounded-lg transition-colors ${
        isDragOver ? 'bg-brand-green-light/60' : ''
      }`}
      data-testid={`kanban-column-${status}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${TASK_STATUS_COLORS[status]}`} />
        <span className="text-sm font-semibold text-text-primary">{TASK_STATUS_LABELS[status]}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TASK_STATUS_BADGE_CLASSES[status]}`}
        >
          {tasks.length}
        </span>
        <button
          type="button"
          aria-label={`Add task to ${TASK_STATUS_LABELS[status]}`}
          onClick={() => onQuickAdd(status)}
          className="ml-auto text-lg leading-none text-text-secondary hover:text-brand-green"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {tasks.length === 0 && (
          <p className="text-xs text-text-secondary">No tasks in {TASK_STATUS_LABELS[status]}.</p>
        )}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            lobby={lobbiesById.get(task.lobbyId)}
            assignee={task.assigneeId != null ? assigneesById.get(task.assigneeId) : undefined}
            isMoving={movingTaskId === task.id}
            moveError={moveErrors[task.id]}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onQuickAdd(status)}
        className="mt-2.5 w-full rounded-lg border-2 border-dashed border-border py-2 text-xs font-medium text-text-secondary hover:border-brand-green hover:text-brand-green"
      >
        + Add task
      </button>
    </div>
  );
};
