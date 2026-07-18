import {api} from '@/lib/apiClient';
import type { LoginRequestDto, LoginResponseDto, PasswordResetDto, PasswordResetRequestDto } from '@/features/auth/model';

export const login = (data: LoginRequestDto): Promise<LoginResponseDto> => {
    return api.post('auth/login', {json: data}).json<LoginResponseDto>();
}

export const requestPasswordReset = async (data: PasswordResetRequestDto): Promise<void> => {
    return api.post('auth/password-reset-requests', {json: data}).then(() => undefined);
}

export const resetPassword = async (data: PasswordResetDto): Promise<void> => {
    return api.post('auth/password-resets', {json: data}).then(() => undefined);
}
