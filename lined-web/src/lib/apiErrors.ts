import { getErrorStatus } from '@/lib/apiClient';

export const getApiErrorMessage = (error: unknown, statusMessages: Partial<Record<number, string>>, fallback: string): string => {
  const status = getErrorStatus(error);
  if (status !== undefined) {
    const message = statusMessages[status];
    if (message) return message;
  }
  return fallback;
}
