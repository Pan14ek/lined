import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils';
import { SignUpPage } from './SignUpPage';
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

describe('SignUpPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null, token: null });
  });

  it('creates an account, stores the id, and redirects home', async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByLabelText(/username/i), 'new_user');
    await user.type(screen.getByLabelText(/email address/i), 'new_user@lined.app');
    await user.type(screen.getByLabelText(/^password$/i), 'strongpass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument());
    expect(useAuthStore.getState().userId).toBe(99);
  });

  it('shows an inline error when the username/email is already taken', async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByLabelText(/username/i), 'alex_johnson');
    await user.type(screen.getByLabelText(/email address/i), 'alex@lined.app');
    await user.type(screen.getByLabelText(/^password$/i), 'strongpass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Username or email already taken',
    );
    expect(useAuthStore.getState().userId).toBeNull();
  });
});
