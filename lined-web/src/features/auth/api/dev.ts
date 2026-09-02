import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_USERS } from '@/features/users/api/mockData';
import type { LoginRequestDto, LoginResponseDto, PasswordResetDto, PasswordResetRequestDto } from '@/features/auth/model';
import { getCurrentMockUserId, getMockUserByToken } from './mockIdentity';

let mockSessionUserId: number | null = null;

export const login = async (data: LoginRequestDto): Promise<LoginResponseDto> => {
  await mockDelay();
  const user = MOCK_USERS.find(
    (u) => u.username === data.identifier || u.email === data.identifier,
  );
  if (!user || data.password === '') {
    throw new MockHttpError(401, 'Invalid email, username, or password');
  }
  mockSessionUserId = user.id;
  return {
    accessToken: `mock-token-${user.id}`,
    tokenType: 'Bearer',
    expiresIn: 900,
  };
}

export const refresh = async (): Promise<LoginResponseDto> => {
  await mockDelay();
  const userId = getCurrentMockUserId() ?? mockSessionUserId;
  const user = getMockUserByToken(userId == null ? null : `mock-token-${userId}`);
  if (!user) throw new MockHttpError(401, 'Invalid refresh session');
  return { accessToken: `mock-token-${user.id}`, tokenType: 'Bearer', expiresIn: 900 };
}

export const initializeCsrf = async (): Promise<void> => {
  await mockDelay(0);
}

export const logout = async (): Promise<void> => {
  await mockDelay();
  mockSessionUserId = null;
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
