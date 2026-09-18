import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { SignUpPage } from '../SignUpPage';
import { useAuthStore } from '@/store/auth';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const renderSignUp = () => {
  return renderWithProviders(
    <Routes>
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/sign-in" element={<div>Sign In Page</div>} />
      <Route path="/" element={<div>Home Page</div>} />
    </Routes>,
    { initialEntries: ['/sign-up'] },
  );
}

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>, overrides?: { username?: string; email?: string }) => {
  await user.type(screen.getByLabelText(/username/i), overrides?.username ?? 'new_user');
  await user.type(
    screen.getByLabelText(/email address/i),
    overrides?.email ?? 'new_user@lined.app',
  );
  await user.type(screen.getByLabelText(/^password$/i), 'strongpass1');
  await user.type(screen.getByLabelText(/confirm password/i), 'strongpass1');
}

describe('SignUpPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, status: 'unauthenticated' });
  });

  it('creates an account and redirects to sign-in without authenticating', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSignUp();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('shows a banner error when the username/email is already taken', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSignUp();

    await fillValidForm(user, { username: 'alex_johnson', email: 'alex@lined.app' });
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Username or email already taken',
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('shows a required-field error after blurring an empty username', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderSignUp();

    await user.click(screen.getByLabelText(/username/i));
    await user.tab();

    expect(await screen.findByText('Username is required')).toBeInTheDocument();
  });

  it('shows a mismatch error when the passwords differ and blocks submission', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByLabelText(/username/i), 'new_user');
    await user.type(screen.getByLabelText(/email address/i), 'new_user@lined.app');
    await user.type(screen.getByLabelText(/^password$/i), 'strongpass1');
    await user.type(screen.getByLabelText(/confirm password/i), 'different1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('shows a cooldown and disables submission after a rate-limit response', async () => {
    server.use(http.post(`${BASE}/users`, () => new HttpResponse(null, {
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      headers: { 'Retry-After': '5' },
    })));
    const user = userEvent.setup();
    renderSignUp();

    await fillValidForm(user, { username: 'new-user', email: 'new@lined.app' });
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i);
    expect(screen.getByRole('status')).toHaveTextContent(/try again in \d+ seconds/i);
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });
});
