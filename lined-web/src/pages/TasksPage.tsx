import { KanbanBoard } from '@/components/tasks/KanbanBoard';

export function TasksPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <KanbanBoard />
    </div>
  );
}
