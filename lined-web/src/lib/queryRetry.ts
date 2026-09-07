import { getErrorStatus } from '@/lib/apiClient';

/** Terminal auth/authorization responses should not be blindly retried. */
import { HTTP_STATUS } from '@/lib/httpStatus';

const AUTH_TERMINAL_STATUSES = new Set<number>([
  HTTP_STATUS.UNAUTHORIZED,
  HTTP_STATUS.FORBIDDEN,
  HTTP_STATUS.NOT_FOUND,
]);
const DEFAULT_QUERY_RETRY_LIMIT = 3;

/** Default `QueryClient` retry policy: skip 401/403/404, keep the default limit otherwise. */
export const defaultQueryRetry = (failureCount: number, error: unknown): boolean => {
  if (AUTH_TERMINAL_STATUSES.has(getErrorStatus(error) ?? -1)) return false;
  return failureCount < DEFAULT_QUERY_RETRY_LIMIT;
}
