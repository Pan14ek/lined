import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { server } from '@/test/server';
import { ForgotPasswordPage } from '../ForgotPasswordPage';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

function renderForgotPassword() {
  return renderWithProviders(
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/sign-in" element={<div>Sign In Page</div>} />
    </Routes>,
    { initialEntries: ['/forgot-password'] },
  );
}

describe('ForgotPasswordPage', () => {
  it('shows the neutral success message for a known identifier', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderForgotPassword();

    await user.type(screen.getByLabelText(/email or username/i), 'alex@lined.app');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText(/we've sent a link to reset your password/i),
    ).toBeInTheDocument();
  });

  it('shows the same neutral success message for an unknown identifier', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderForgotPassword();

    await user.type(screen.getByLabelText(/email or username/i), 'nobody@lined.app');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText(/we've sent a link to reset your password/i),
    ).toBeInTheDocument();
  });

  it('shows a required-field error after blurring an empty identifier', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderForgotPassword();

    await user.click(screen.getByLabelText(/email or username/i));
    await user.tab();

    expect(await screen.findByText('Email or username is required')).toBeInTheDocument();
  });

  it('shows a pending label while the request is in flight', async () => {
    expect.assertions(1);
    server.use(
      http.post(`${BASE}/auth/password-reset-requests`, async () => {
        await delay(50);
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const user = userEvent.setup();
    renderForgotPassword();

    await user.type(screen.getByLabelText(/email or username/i), 'alex@lined.app');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });
});
