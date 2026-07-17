import { api } from './client';
import type {
  LoginRequestDto,
  LoginResponseDto,
  PasswordResetDto,
  PasswordResetRequestDto,
} from '@/types';

export function login(data: LoginRequestDto): Promise<LoginResponseDto> {
  return api.post('auth/login', { json: data }).json<LoginResponseDto>();
}

export function requestPasswordReset(data: PasswordResetRequestDto): Promise<void> {
  return api.post('auth/password-reset-requests', { json: data }).then(() => undefined);
}

export function resetPassword(data: PasswordResetDto): Promise<void> {
  return api.post('auth/password-resets', { json: data }).then(() => undefined);
}
