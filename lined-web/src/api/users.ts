import { api, requestVoid } from './client';
import type { UserDto, UserCreateDto, UserUpdateDto, UserPageDto } from '@/types';

export function getUser(id: number): Promise<UserDto> {
  return api.get(`users/${id}`).json<UserDto>();
}

export function createUser(data: UserCreateDto): Promise<UserDto> {
  return api.post('users', { json: data }).json<UserDto>();
}

export function updateUser(id: number, data: UserUpdateDto): Promise<UserDto> {
  return api.patch(`users/${id}`, { json: data }).json<UserDto>();
}

export function searchUsers(q: string, page = 0, size = 20): Promise<UserPageDto> {
  return api
    .get('users/search', { searchParams: { q, page, size } })
    .json<UserPageDto>();
}

export function deleteUser(id: number): Promise<void> {
  return requestVoid('delete', `users/${id}`);
}
