import { api } from './client';
import type { TaskDto, TaskCreateDto, TaskUpdateDto } from '@/types';

export function listTasks(params?: {
  lobbyId?: number;
  assigneeId?: number;
  status?: string;
}): Promise<TaskDto[]> {
  return api
    .get('tasks', { searchParams: params as Record<string, string | number> })
    .json<TaskDto[]>();
}

export function createTask(data: TaskCreateDto): Promise<TaskDto> {
  return api.post('tasks', { json: data }).json<TaskDto>();
}

export function updateTask(id: number, data: TaskUpdateDto): Promise<TaskDto> {
  return api.patch(`tasks/${id}`, { json: data }).json<TaskDto>();
}

export function deleteTask(id: number): Promise<void> {
  return api.delete(`tasks/${id}`).then(() => undefined);
}
