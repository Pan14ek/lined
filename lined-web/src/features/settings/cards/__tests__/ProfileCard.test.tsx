import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useAuthStore } from '@/store/auth';
import { ProfileCard } from '../ProfileCard';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const user = MOCK_USERS[0]!;

describe('ProfileCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: user.id });
  });

  it('shows a loading skeleton while the user is loading', () => {
    expect.assertions(1);
    renderWithProviders(
      <ProfileCard user={undefined} isLoading={true} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByTestId('profile-card-loading')).toBeInTheDocument();
  });

  it('pre-fills username and email from the user', () => {
    expect.assertions(2);
    renderWithProviders(
      <ProfileCard user={user} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByLabelText('Username')).toHaveValue(user.username);
    expect(screen.getByLabelText('Email address')).toHaveValue(user.email);
  });

  it('keeps Save changes disabled until a field is edited', async () => {
    expect.assertions(2);
    const userEventInstance = userEvent.setup();
    renderWithProviders(
      <ProfileCard user={user} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await userEventInstance.type(screen.getByLabelText('Username'), 'x');

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('saves only the changed field', async () => {
    expect.assertions(1);
    let receivedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${BASE}/users/:id`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...user, ...receivedBody });
      }),
    );
    const userEventInstance = userEvent.setup();
    renderWithProviders(
      <ProfileCard user={user} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    await userEventInstance.clear(screen.getByLabelText('Email address'));
    await userEventInstance.type(screen.getByLabelText('Email address'), 'new@lined.app');
    await userEventInstance.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(receivedBody).toEqual({ email: 'new@lined.app' }));
  });

  it('shows an inline conflict error on 409', async () => {
    expect.assertions(1);
    server.use(
      http.patch(`${BASE}/users/:id`, () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'taken' }, { status: HTTP_STATUS.CONFLICT }),
      ),
    );
    const userEventInstance = userEvent.setup();
    renderWithProviders(
      <ProfileCard user={user} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    await userEventInstance.type(screen.getByLabelText('Username'), 'x');
    await userEventInstance.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That username or email is already taken',
    );
  });

  it('shows a generic error on 500', async () => {
    expect.assertions(1);
    server.use(http.patch(`${BASE}/users/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const userEventInstance = userEvent.setup();
    renderWithProviders(
      <ProfileCard user={user} isLoading={false} isError={false} onRetry={vi.fn()} />,
    );

    await userEventInstance.type(screen.getByLabelText('Username'), 'x');
    await userEventInstance.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong — please try again',
    );
  });

  it('shows an error state with a working retry action when the profile fails to load', async () => {
    expect.assertions(2);
    const onRetry = vi.fn();
    const userEventInstance = userEvent.setup();
    renderWithProviders(
      <ProfileCard user={undefined} isLoading={false} isError onRetry={onRetry} />,
    );

    expect(screen.getByText("Couldn't load your profile")).toBeInTheDocument();

    await userEventInstance.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
