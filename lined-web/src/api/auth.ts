import { api } from './client';
import type { LoginRequestDto, LoginResponseDto } from '@/types';

export function login(data: LoginRequestDto): Promise<LoginResponseDto> {
  return api.post('auth/login', { json: data }).json<LoginResponseDto>();
}
