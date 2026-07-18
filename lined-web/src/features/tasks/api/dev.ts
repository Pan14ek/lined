import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_TASKS } from './mockData';
import type { TaskDto, TaskCreateDto, TaskUpdateDto } from '@/features/tasks/model';

const tasks: TaskDto[] = MOCK_TASKS.map((t) => ({ ...t }));
let nextId = Math.max(...tasks.map((t) => t.id)) + 1;

export const listTasks = async (params?: {
  lobbyId?: number;
  assigneeId?: number;
  status?: string;
}): Promise<TaskDto[]> => {
  await mockDelay();
  return tasks.filter(
    (t) =>
      (params?.lobbyId == null || t.lobbyId === params.lobbyId) &&
      (params?.assigneeId == null || t.assigneeId === params.assigneeId) &&
      (params?.status == null || t.status === params.status),
  );
}

export const createTask = async (data: TaskCreateDto): Promise<TaskDto> => {
  await mockDelay();
  if (!data.title.trim()) throw new MockHttpError(400, 'title must not be blank');
  const task: TaskDto = {
    id: nextId++,
    title: data.title,
    description: data.description ?? null,
    priority: data.priority ?? 'MEDIUM',
    status: data.status ?? 'TODO',
    lobbyId: data.lobbyId,
    creatorId: 1,
    assigneeId: data.assigneeId ?? null,
    dueDate: data.dueDate ?? null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

export const updateTask = async (id: number, data: TaskUpdateDto): Promise<TaskDto> => {
  await mockDelay();
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new MockHttpError(404, 'Task not found');
  Object.assign(task, data);
  return task;
}

export const deleteTask = async (id: number): Promise<void> => {
  await mockDelay();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) throw new MockHttpError(404, 'Task not found');
  tasks.splice(index, 1);
}

export const listMyTasks = async (): Promise<TaskDto[]> => {
  await mockDelay();
  return tasks;
}
