import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { ResetPasswordPage } from '../ResetPasswordPage';

function renderResetPassword(initialEntry: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/sign-in" element={<div>Sign In Page</div>} />
      <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
    </Routes>,
    { initialEntries: [initialEntry] },
  );
}

async function fillPasswords(
  user: ReturnType<typeof userEvent.setup>,
  newPassword: string,
  confirmPassword: string,
) {
  await user.type(screen.getByLabelText(/new password/i), newPassword);
  await user.type(screen.getByLabelText(/confirm password/i), confirmPassword);
}

describe('ResetPasswordPage', () => {
  it('shows an invalid-link alert with no form when the token is missing', () => {
    expect.assertions(2);
    renderResetPassword('/reset-password');

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('resets the password with a valid token and redirects to sign-in with a success flag', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderResetPassword('/reset-password?token=valid-token');

    await fillPasswords(user, 'newstrongpass1', 'newstrongpass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
  });

  it('shows a mismatch error when the passwords differ and blocks submission', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderResetPassword('/reset-password?token=valid-token');

    await fillPasswords(user, 'newstrongpass1', 'differentpass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows a min-length error for a short password', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderResetPassword('/reset-password?token=valid-token');

    await fillPasswords(user, 'short', 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeInTheDocument();
  });

  it('shows an invalid/expired alert with a link back when the server rejects the token', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderResetPassword('/reset-password?token=expired-token');

    await fillPasswords(user, 'newstrongpass1', 'newstrongpass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});
