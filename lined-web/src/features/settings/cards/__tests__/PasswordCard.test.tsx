import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createTestQueryClient, renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useAuthStore } from '@/store/auth';
import { QUERY_KEYS } from '@/features/users/lib/constants';
import { PasswordCard } from '../PasswordCard';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const user = MOCK_USERS[0]!;

/** `useUpdateCurrentUser` resolves its target id from the `/users/me` cache. */
const renderWithCurrentUser = (ui: Parameters<typeof renderWithProviders>[0]) => {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.currentUser, user);
  return renderWithProviders(ui, { queryClient });
}

describe('PasswordCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: `mock-token-${user.id}`, status: 'authenticated' });
  });

  it('keeps Change password disabled until both fields are filled in', async () => {
    expect.assertions(2);
    const userEventInstance = userEvent.setup();
    renderWithProviders(<PasswordCard userId={user.id} />);

    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();

    await userEventInstance.type(screen.getByLabelText('New password'), 'longenough1');
    await userEventInstance.type(screen.getByLabelText('Confirm new password'), 'longenough1');

    expect(screen.getByRole('button', { name: 'Change password' })).toBeEnabled();
  });

  it('shows a validation error when passwords do not match', async () => {
    expect.assertions(1);
    const userEventInstance = userEvent.setup();
    renderWithProviders(<PasswordCard userId={user.id} />);

    await userEventInstance.type(screen.getByLabelText('New password'), 'longenough1');
    await userEventInstance.type(screen.getByLabelText('Confirm new password'), 'different1');
    await userEventInstance.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
  });

  it('submits the new password and clears the fields on success', async () => {
    expect.assertions(2);
    let receivedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${BASE}/users/:id`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...user });
      }),
    );
    const userEventInstance = userEvent.setup();
    renderWithCurrentUser(<PasswordCard userId={user.id} />);

    await userEventInstance.type(screen.getByLabelText('New password'), 'longenough1');
    await userEventInstance.type(screen.getByLabelText('Confirm new password'), 'longenough1');
    await userEventInstance.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(receivedBody).toEqual({ password: 'longenough1' }));
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('shows a generic error on 500', async () => {
    expect.assertions(1);
    server.use(http.patch(`${BASE}/users/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const userEventInstance = userEvent.setup();
    renderWithCurrentUser(<PasswordCard userId={user.id} />);

    await userEventInstance.type(screen.getByLabelText('New password'), 'longenough1');
    await userEventInstance.type(screen.getByLabelText('Confirm new password'), 'longenough1');
    await userEventInstance.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong — please try again',
    );
  });
});
