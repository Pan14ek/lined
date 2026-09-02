import { MOCK_USERS } from '@/features/users/api/mockData';
import { useAuthStore } from '@/store/auth';
import type { UserDto } from '@/features/users/model';

export const getMockUserByToken = (token: string | null): UserDto | undefined => {
  const match = /^mock-token-(\d+)(?:-refreshed)?$/.exec(token ?? '');
  return match ? MOCK_USERS.find((user) => user.id === Number(match[1])) : undefined;
};

export const getCurrentMockUserId = (): number | null => {
  return getMockUserByToken(useAuthStore.getState().accessToken)?.id ?? null;
};

export const getMockUserFromRequest = (request: Request): UserDto | undefined => {
  const authorization = request.headers.get('Authorization');
  return getMockUserByToken(authorization?.replace(/^Bearer\s+/i, '') ?? null);
};
