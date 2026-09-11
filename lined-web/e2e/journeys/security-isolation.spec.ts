import { test, expect } from '@playwright/test';
import { closeContexts, createEventFromDashboard, createLobby, createSharedLobbyWithBob, createTaskInLobby, newUser, registerAndSignIn, signOut } from '../helpers/product';

test('E2E-SEC-01 clears Alice data before Bob signs in in the same context', async ({ page }) => {
  const alice = newUser('cache-alice');
  const bob = newUser('cache-bob');
  const lobbyName = `E2E Alice-only ${alice.username}`;
  const taskTitle = `E2E Alice-only task ${alice.username}`;
  const eventTitle = `E2E Alice-only event ${alice.username}`;
  await registerAndSignIn(page, alice);
  await createLobby(page, lobbyName);
  await createTaskInLobby(page, taskTitle);
  await createEventFromDashboard(page, eventTitle, 'SHARED');
  await signOut(page);
  await registerAndSignIn(page, bob);
  await expect(page.getByText(lobbyName, { exact: true })).toHaveCount(0);
  await expect(page.getByText(taskTitle, { exact: true })).toHaveCount(0);
  await expect(page.getByText(eventTitle, { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(lobbyName, { exact: true })).toHaveCount(0);
  await expect(page.getByText(taskTitle, { exact: true })).toHaveCount(0);
  await expect(page.getByText(eventTitle, { exact: true })).toHaveCount(0);
});

test('E2E-SEC-02 redirects an unauthenticated visitor without protected-content flash', async ({ page }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText('My Lobbies', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
});

test('E2E-CALENDAR-02 returns a private event as not found to a foreign authenticated user', async ({ browser }) => {
  const alice = newUser('security-private-alice');
  const bob = newUser('security-private-bob');
  const title = `E2E hidden object ${alice.username}`;
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  try {
    await registerAndSignIn(alicePage, alice);
    await registerAndSignIn(bobPage, bob);
    await createSharedLobbyWithBob(alicePage, bobPage, bob, `E2E security ${alice.username}`);
    const eventId = await createEventFromDashboard(alicePage, title, 'PRIVATE');
    let token = '';
    const listener = (request: import('@playwright/test').Request) => {
      const authorization = request.headers().authorization;
      if (authorization?.startsWith('Bearer ')) token = authorization.slice('Bearer '.length);
    };
    bobPage.on('request', listener);
    await bobPage.goto('/calendar');
    await bobPage.waitForLoadState('networkidle');
    bobPage.off('request', listener);
    expect(token).not.toBe('');
    const response = await bobPage.request.get(`${process.env.E2E_API_BASE_URL}/calendar/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(404);
    await expect(bobPage.getByText(title, { exact: true })).toHaveCount(0);
  } finally {
    await closeContexts(aliceContext, bobContext);
  }
});
