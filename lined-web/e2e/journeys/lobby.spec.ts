import { test, expect } from '@playwright/test';
import { closeContexts, createLobby, createSharedLobbyWithBob, newUser, registerAndSignIn } from '../helpers/product';

test('E2E-LOBBY-01 lets Alice create and open a lobby', async ({ page }) => {
  const alice = newUser('lobby-create');
  const lobbyName = `E2E lobby ${alice.username}`;
  await registerAndSignIn(page, alice);
  const lobbyPath = await createLobby(page, lobbyName);
  expect(lobbyPath).toMatch(/^\/lobbies\/\d+$/);
  await expect(page.getByRole('tab', { name: /Tasks/ })).toBeVisible();
  await expect(page.getByRole('link', { name: lobbyName })).toBeVisible();
});

test('E2E-LOBBY-02 invites Bob in a separate browser context and joins the lobby', async ({ browser }) => {
  const alice = newUser('lobby-invite-alice');
  const bob = newUser('lobby-invite-bob');
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  try {
    await registerAndSignIn(alicePage, alice);
    await registerAndSignIn(bobPage, bob);
    const lobbyPath = await createSharedLobbyWithBob(alicePage, bobPage, bob, `E2E invite ${alice.username}`);
    await alicePage.reload();
    await expect(alicePage.getByText('2 members', { exact: true })).toBeVisible();
    await expect(bobPage.getByRole('tab', { name: /Members/ })).toBeVisible();
    expect(lobbyPath).toMatch(/^\/lobbies\/\d+$/);
  } finally {
    await closeContexts(aliceContext, bobContext);
  }
});
