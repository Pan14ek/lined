import { expect, type BrowserContext, type Page } from '@playwright/test';

export interface E2eUser {
  username: string;
  email: string;
  password: string;
}

const runId = process.env.E2E_RUN_ID ?? `local-${Date.now()}`;
let userSequence = 0;

export const newUser = (role: string): E2eUser => {
  userSequence += 1;
  const suffix = `${runId}-${role}-${userSequence}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return {
    username: `e2e_${suffix}`.slice(0, 64),
    email: `${suffix}@example.test`,
    password: 'E2e-password-2026!',
  };
};

export const register = async (page: Page, user: E2eUser): Promise<void> => {
  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/sign-in\?registered=success$/);
};

export const signIn = async (page: Page, user: E2eUser): Promise<void> => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading').filter({ hasText: user.username }).first()).toBeVisible();
};

export const registerAndSignIn = async (page: Page, user: E2eUser): Promise<void> => {
  await register(page, user);
  await signIn(page, user);
};

export const signOut = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
};

export const resetLinkFromMailpit = async (email: string): Promise<string> => {
  const mailpitUrl = process.env.E2E_MAILPIT_API_URL;
  if (!mailpitUrl) throw new Error('E2E_MAILPIT_API_URL is not configured.');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    if (!search.ok) throw new Error(`Mailpit search failed with HTTP ${search.status}.`);
    const result = await search.json() as { messages?: Array<{ ID: string }> };
    const message = result.messages?.[0];
    if (message) {
      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
      if (!detailResponse.ok) throw new Error(`Mailpit message read failed with HTTP ${detailResponse.status}.`);
      const detail = await detailResponse.json() as { Text?: string; HTML?: string };
      const body = `${detail.Text ?? ''}\n${detail.HTML ?? ''}`;
      const match = body.match(/https?:\/\/[^\s"'<>]+\/reset-password\?token=[^\s"'<>]+/);
      if (match) return match[0].replace(/&amp;/g, '&').replace(/[.)]+$/, '');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for the password-reset email for ${email}.`);
};

export const createLobby = async (page: Page, name: string): Promise<string> => {
  await page.getByRole('button', { name: '+ Create', exact: true }).click();
  await page.getByRole('menuitem', { name: 'New Lobby' }).click();
  await expect(page.getByRole('heading', { name: 'New Lobby' })).toBeVisible();
  await page.getByLabel('Lobby name').fill(name);
  await page.getByRole('button', { name: 'Create Lobby' }).click();
  await expect(page).toHaveURL(/\/lobbies\/\d+$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  return new URL(page.url()).pathname;
};

export const inviteAndAccept = async (
  alicePage: Page,
  bobPage: Page,
  bob: E2eUser,
  lobbyPath: string,
): Promise<void> => {
  await alicePage.getByRole('button', { name: '+ Add member' }).click();
  await expect(alicePage.getByRole('heading', { name: 'Add Member' })).toBeVisible();
  await alicePage.getByLabel('Search user').fill(bob.username);
  await expect(alicePage.getByText(bob.username, { exact: true })).toBeVisible();
  await alicePage.getByRole('button', { name: 'Invite' }).click();
  await expect(alicePage.getByRole('button', { name: 'Invite sent' })).toBeVisible();
  await alicePage.getByRole('button', { name: 'Done', exact: true }).click();

  await bobPage.goto('/');
  await expect(bobPage.getByText(/invited you to/)).toBeVisible();
  await bobPage.getByRole('button', { name: 'Accept' }).click();
  await expect(bobPage).toHaveURL(new RegExp(`${lobbyPath}$`));
  await expect(bobPage.getByRole('tab', { name: /Tasks/ })).toBeVisible();
};

export const createSharedLobbyWithBob = async (
  alicePage: Page,
  bobPage: Page,
  bob: E2eUser,
  name: string,
): Promise<string> => {
  const lobbyPath = await createLobby(alicePage, name);
  await inviteAndAccept(alicePage, bobPage, bob, lobbyPath);
  return lobbyPath;
};

export const createTaskInLobby = async (page: Page, title: string): Promise<void> => {
  await page.getByRole('tab', { name: /Tasks/ }).click();
  await page.getByRole('button', { name: '+ Add task' }).click();
  await expect(page.getByRole('heading', { name: 'Add Task' })).toBeVisible();
  await page.getByLabel('Task title').fill(title);
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
};

const toLocalDateTime = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const createEventFromDashboard = async (
  page: Page,
  title: string,
  visibility: 'SHARED' | 'PRIVATE',
): Promise<number> => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Create', exact: true }).click();
  await page.getByRole('menuitem', { name: 'New Event' }).click();
  await expect(page.getByRole('heading', { name: 'New Event' })).toBeVisible();
  await page.getByLabel('Event title').fill(title);
  // Keep the fixture inside the calendar's initially visible week. Choosing
  // tomorrow makes the test fall outside that week when it runs on Sunday.
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  await page.getByLabel('Start').fill(toLocalDateTime(start));
  await page.getByLabel('End').fill(toLocalDateTime(end));
  if (visibility === 'PRIVATE') await page.getByRole('button', { name: 'Private' }).click();
  const createResponse = page.waitForResponse((response) =>
    response.url().includes('/api/calendar/events') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /Create Event|Create Anyway/ }).click();
  const event = await (await createResponse).json() as { id: number };
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  return event.id;
};

export const closeContexts = async (...contexts: BrowserContext[]): Promise<void> => {
  await Promise.all(contexts.map((context) => context.close()));
};
