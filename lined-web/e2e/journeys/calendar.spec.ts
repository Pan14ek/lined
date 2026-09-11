import { test, expect } from '@playwright/test';
import { closeContexts, createEventFromDashboard, createSharedLobbyWithBob, newUser, registerAndSignIn } from '../helpers/product';

test('E2E-CALENDAR-01 shows Alice’s shared event to Bob', async ({ browser }) => {
  const alice = newUser('calendar-shared-alice');
  const bob = newUser('calendar-shared-bob');
  const title = `E2E shared event ${alice.username}`;
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  try {
    await registerAndSignIn(alicePage, alice);
    await registerAndSignIn(bobPage, bob);
    await createSharedLobbyWithBob(alicePage, bobPage, bob, `E2E calendar ${alice.username}`);
    await createEventFromDashboard(alicePage, title, 'SHARED');
    await bobPage.goto('/calendar');
    await expect(bobPage.getByText(title, { exact: true })).toBeVisible();
  } finally {
    await closeContexts(aliceContext, bobContext);
  }
});

test('E2E-CALENDAR-02 keeps a private event hidden from Bob', async ({ browser }) => {
  const alice = newUser('calendar-private-alice');
  const bob = newUser('calendar-private-bob');
  const title = `E2E private event ${alice.username}`;
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  try {
    await registerAndSignIn(alicePage, alice);
    await registerAndSignIn(bobPage, bob);
    await createSharedLobbyWithBob(alicePage, bobPage, bob, `E2E private ${alice.username}`);
    await createEventFromDashboard(alicePage, title, 'PRIVATE');
    await expect(alicePage.getByText(title, { exact: true })).toBeVisible();
    await bobPage.goto('/calendar');
    await expect(bobPage.getByText(title, { exact: true })).toHaveCount(0);
  } finally {
    await closeContexts(aliceContext, bobContext);
  }
});
