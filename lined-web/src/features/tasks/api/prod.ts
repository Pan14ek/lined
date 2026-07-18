import { api, requestVoid, toSearchParams } from '@/lib/apiClient';
import type { TaskDto, TaskCreateDto, TaskUpdateDto } from '@/features/tasks/model';

export const listTasks = (params?: {
  lobbyId?: number;
  assigneeId?: number;
  status?: string;
}): Promise<TaskDto[]> => {
  return api
    .get('tasks', { searchParams: toSearchParams(params ?? {}) })
    .json<TaskDto[]>();
}

export const createTask = (data: TaskCreateDto): Promise<TaskDto> => {
  return api.post('tasks', { json: data }).json<TaskDto>();
}

export const updateTask = (id: number, data: TaskUpdateDto): Promise<TaskDto> => {
  return api.patch(`tasks/${id}`, { json: data }).json<TaskDto>();
}

export const deleteTask = (id: number): Promise<void> => {
  return requestVoid('delete', `tasks/${id}`);
}

export const listMyTasks = (): Promise<TaskDto[]> => {
  return api.get('tasks/mine').json<TaskDto[]>();
}
