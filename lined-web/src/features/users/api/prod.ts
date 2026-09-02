import { api, requestVoid } from '@/lib/apiClient';
import type { UserDto, UserCreateDto, UserUpdateDto, UserPageDto } from '@/features/users/model';

export const getUser = (id: number): Promise<UserDto> => {
  return api.get(`users/${id}`).json<UserDto>();
}

export const getCurrentUser = (): Promise<UserDto> => {
  return api.get('users/me').json<UserDto>();
}

export const createUser = (data: UserCreateDto): Promise<UserDto> => {
  return api.post('users', { json: data }).json<UserDto>();
}

export const updateUser = (id: number, data: UserUpdateDto): Promise<UserDto> => {
  return api.patch(`users/${id}`, { json: data }).json<UserDto>();
}

export const searchUsers = (q: string, page = 0, size = 20): Promise<UserPageDto> => {
  return api
    .get('users/search', { searchParams: { q, page, size } })
    .json<UserPageDto>();
}

export const deleteUser = (id: number): Promise<void> => {
  return requestVoid('delete', `users/${id}`);
}
