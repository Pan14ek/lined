export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  lobbyId: number;
  creatorId: number;
  assigneeId: number | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TaskCreateDto {
  title: string;
  lobbyId: number;
  assigneeId?: number;
  dueDate?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  notifyAssignee?: boolean;
}

export interface TaskUpdateDto {
  status?: TaskStatus;
  assigneeId?: number;
  dueDate?: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
}
