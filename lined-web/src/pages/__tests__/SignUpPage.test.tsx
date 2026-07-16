import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { SignUpPage } from '../SignUpPage';
import { useAuthStore } from '@/store/auth';

function renderSignUp() {
  return renderWithProviders(
    <Routes>
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/" element={<div>Home Page</div>} />
    </Routes>,
    { initialEntries: ['/sign-up'] },
  );
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides?: { username?: string; email?: string },
) {
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
    useAuthStore.setState({ userId: null, token: null });
  });

  it('creates an account, stores the id, and redirects home', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderSignUp();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(useAuthStore.getState().userId).toBe(99);
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
    expect(useAuthStore.getState().userId).toBeNull();
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
    expect(useAuthStore.getState().userId).toBeNull();
  });
});
