import { KanbanBoard } from '@/features/tasks/kanban/KanbanBoard';

export const TasksPage = () => {
  return (
    <div className="flex-1 overflow-y-auto">
      <KanbanBoard />
    </div>
  );
}
