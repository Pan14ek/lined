import { HTTPError } from 'ky';

/** Maps an HTTP error's status code to a user-facing message, else `fallback`. */
export function getApiErrorMessage(
  error: unknown,
  statusMessages: Partial<Record<number, string>>,
  fallback: string,
): string {
  if (error instanceof HTTPError) {
    const message = statusMessages[error.response.status];
    if (message) return message;
  }
  return fallback;
}
