import { api, requestVoid, toSearchParams } from './client';
import type { TaskDto, TaskCreateDto, TaskUpdateDto } from '@/types';

export function listTasks(params?: {
  lobbyId?: number;
  assigneeId?: number;
  status?: string;
}): Promise<TaskDto[]> {
  return api
    .get('tasks', { searchParams: toSearchParams(params ?? {}) })
    .json<TaskDto[]>();
}

export function createTask(data: TaskCreateDto): Promise<TaskDto> {
  return api.post('tasks', { json: data }).json<TaskDto>();
}

export function updateTask(id: number, data: TaskUpdateDto): Promise<TaskDto> {
  return api.patch(`tasks/${id}`, { json: data }).json<TaskDto>();
}

export function deleteTask(id: number): Promise<void> {
  return requestVoid('delete', `tasks/${id}`);
}

export function listMyTasks(): Promise<TaskDto[]> {
  return api.get('tasks/mine').json<TaskDto[]>();
}
