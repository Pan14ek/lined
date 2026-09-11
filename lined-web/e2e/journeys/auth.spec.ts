import { test, expect } from '@playwright/test';
import { newUser, registerAndSignIn, resetLinkFromMailpit, signIn, signOut } from '../helpers/product';

test('E2E-AUTH-01 registers and enters the authenticated application', async ({ page }) => {
  const user = newUser('auth-register');
  await registerAndSignIn(page, user);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading').filter({ hasText: user.username }).first()).toBeVisible();
  await expect(page.getByText(/Invalid credentials|Something went wrong/)).toHaveCount(0);
});

test('E2E-AUTH-02 restores the session after a browser reload', async ({ page }) => {
  const user = newUser('auth-reload');
  await registerAndSignIn(page, user);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('#profile').getByText(user.username, { exact: true })).toBeVisible();
});

test('E2E-AUTH-03 logs out and does not restore access on reload', async ({ page }) => {
  const user = newUser('auth-logout');
  await registerAndSignIn(page, user);
  await signOut(page);
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText(user.username, { exact: true })).toHaveCount(0);
});

test('E2E-AUTH-05 resets a password through the real Mailpit delivery flow', async ({ page }) => {
  const user = newUser('auth-password-reset');
  const updatedPassword = 'E2e-new-password-2026!';
  await registerAndSignIn(page, user);
  await signOut(page);

  await page.goto('/forgot-password');
  await page.getByLabel('Email or username').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/If an account exists for that email or username/)).toBeVisible();

  const resetLink = await resetLinkFromMailpit(user.email);
  await page.goto(resetLink);
  await page.getByLabel('New password').fill(updatedPassword);
  await page.getByLabel('Confirm password').fill(updatedPassword);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=success$/);

  await signIn(page, { ...user, password: updatedPassword });
  await signOut(page);

  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();

  await page.goto(resetLink);
  await page.getByLabel('New password').fill('Another-e2e-password-2026!');
  await page.getByLabel('Confirm password').fill('Another-e2e-password-2026!');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('alert')).toHaveText(/invalid or has expired/i);

  await page.goto('/forgot-password');
  await page.getByLabel('Email or username').fill(`unknown-${user.email}`);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/If an account exists for that email or username/)).toBeVisible();
});
