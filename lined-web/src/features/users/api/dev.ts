import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_USERS } from './mockData';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import type { UserDto, UserCreateDto, UserUpdateDto, UserPageDto } from '@/features/users/model';

const users: UserDto[] = MOCK_USERS.map((u) => ({ ...u }));
let nextId = Math.max(...users.map((u) => u.id)) + 1;

export const getUser = async (id: number): Promise<UserDto> => {
  await mockDelay();
  const user = users.find((u) => u.id === id);
  if (!user) throw new MockHttpError(404, 'User not found');
  return user;
}

export const createUser = async (data: UserCreateDto): Promise<UserDto> => {
  await mockDelay();
  const taken = users.some((u) => u.username === data.username || u.email === data.email);
  if (taken) throw new MockHttpError(409, 'Username or email already registered');
  const user: UserDto = {
    id: nextId++,
    username: data.username,
    email: data.email,
    createdAt: new Date().toISOString(),
    roles: data.roles ?? ['ROLE_USER'],
    activePlan: null,
    activeUntil: null,
  };
  users.push(user);
  return user;
}

export const updateUser = async (id: number, data: UserUpdateDto): Promise<UserDto> => {
  await mockDelay();
  const user = users.find((u) => u.id === id);
  if (!user) throw new MockHttpError(404, 'User not found');
  if (data.username !== undefined && !data.username.trim()) {
    throw new MockHttpError(400, 'username must not be blank');
  }
  const taken = users.some(
    (u) => u.id !== id && (u.username === data.username || u.email === data.email),
  );
  if (taken) throw new MockHttpError(409, 'Username or email already registered');
  Object.assign(user, data);
  return user;
}

export const searchUsers = async (q: string, page = 0, size = 20): Promise<UserPageDto> => {
  await mockDelay();
  const query = q.toLowerCase();
  const matches = users.filter(
    (u) => u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
  );
  return {
    content: matches,
    page,
    size,
    totalElements: matches.length,
    totalPages: 1,
  };
}

export const deleteUser = async (id: number): Promise<void> => {
  await mockDelay();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new MockHttpError(404, 'User not found');
  const ownsLobby = MOCK_LOBBIES.some((l) => l.ownerId === id);
  if (ownsLobby) throw new MockHttpError(409, 'Account owns one or more lobbies');
  users.splice(index, 1);
}
