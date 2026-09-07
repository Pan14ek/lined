import { api, requestVoid } from '@/lib/apiClient';
import type { UserDto, UserCreateDto, UserUpdateDto, UserPageDto, UserPublicDto } from '@/features/users/model';

/**
 * Returns the full profile only when `id` is the caller's own account; the
 * backend returns a minimal `UserPublicDto` for every other id, so callers
 * must not rely on more than `id`/`username` from this response.
 */
export const getUser = (id: number): Promise<UserPublicDto> => {
  return api.get(`users/${id}`).json<UserPublicDto>();
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
