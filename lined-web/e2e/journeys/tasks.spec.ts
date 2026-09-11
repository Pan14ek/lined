import { test, expect } from '@playwright/test';
import { closeContexts, createSharedLobbyWithBob, createTaskInLobby, newUser, registerAndSignIn } from '../helpers/product';

test('E2E-TASK-01 shares a task and persists Bob’s representative update', async ({ browser }) => {
  const alice = newUser('task-alice');
  const bob = newUser('task-bob');
  const taskTitle = `E2E shared task ${alice.username}`;
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  try {
    await registerAndSignIn(alicePage, alice);
    await registerAndSignIn(bobPage, bob);
    const lobbyPath = await createSharedLobbyWithBob(alicePage, bobPage, bob, `E2E task ${alice.username}`);
    await createTaskInLobby(alicePage, taskTitle);
    await bobPage.goto(`${lobbyPath}?tab=tasks`);
    await expect(bobPage.getByText(taskTitle, { exact: true })).toBeVisible();
    const updateResponse = bobPage.waitForResponse((response) =>
      response.url().includes('/api/tasks/') && response.request().method() === 'PATCH',
    );
    await bobPage.getByRole('checkbox', { name: `Mark "${taskTitle}" as done` }).click();
    const response = await updateResponse;
    expect(response.status(), await response.text()).toBe(200);
    await alicePage.reload();
    await expect(alicePage.getByText(taskTitle, { exact: true })).toBeVisible();
    await expect(alicePage.getByRole('checkbox', { name: `Mark "${taskTitle}" as to do` })).toBeVisible();
  } finally {
    await closeContexts(aliceContext, bobContext);
  }
});
