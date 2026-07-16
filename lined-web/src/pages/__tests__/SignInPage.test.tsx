import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { SignInPage } from '../SignInPage';
import { useAuthStore } from '@/store/auth';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

function renderSignIn() {
  return renderWithProviders(
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/" element={<div>Home Page</div>} />
    </Routes>,
    { initialEntries: ['/sign-in'] },
  );
}

describe('SignInPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null, token: null });
  });

  it('signs in with a known identifier and redirects home', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText(/email address/i), 'alex@lined.app');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(useAuthStore.getState().userId).toBe(1);
  });

  it('shows an inline error for an unknown identifier', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText(/email address/i), 'nobody@lined.app');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(useAuthStore.getState().userId).toBeNull();
  });

  it('shows a pending label while the request is in flight', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/auth/login`, async () => {
        await delay(50);
        return HttpResponse.json(
          { title: 'Unauthorized', detail: 'Invalid credentials' },
          { status: 401 },
        );
      }),
    );
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText(/email address/i), 'alex@lined.app');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('shows a required-field error after blurring an empty password', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderSignIn();

    await user.click(screen.getByLabelText(/password/i));
    await user.tab();

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });
});
