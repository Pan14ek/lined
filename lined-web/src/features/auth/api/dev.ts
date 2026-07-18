import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_USERS } from '@/features/users/api/mockData';
import type { LoginRequestDto, LoginResponseDto, PasswordResetDto, PasswordResetRequestDto } from '@/features/auth/model';

export const login = async (data: LoginRequestDto): Promise<LoginResponseDto> => {
  await mockDelay();
  const user = MOCK_USERS.find(
    (u) => u.username === data.identifier || u.email === data.identifier,
  );
  if (!user || data.password === '') {
    throw new MockHttpError(401, 'Invalid email, username, or password');
  }
  return {
    accessToken: `mock-token-${user.id}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    userId: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };
}

export const requestPasswordReset = async (_data: PasswordResetRequestDto): Promise<void> => {
  await mockDelay();
}

export const resetPassword = async (data: PasswordResetDto): Promise<void> => {
  await mockDelay();
  if (data.token !== 'valid-token') {
    throw new MockHttpError(400, 'Invalid or expired reset token');
  }
}
