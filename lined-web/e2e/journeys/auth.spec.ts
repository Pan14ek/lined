import { test, expect } from '@playwright/test';
import { newUser, registerAndSignIn, signOut } from '../helpers/product';

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
