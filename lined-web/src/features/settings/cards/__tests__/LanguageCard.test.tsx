import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useSettingsStore } from '@/store/settings';
import i18n from '@/i18n';
import { LanguageCard } from '../LanguageCard';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const testUser = MOCK_USERS[0]!;

describe('LanguageCard', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'en' });
  });

  afterEach(async () => {
    useSettingsStore.setState({ locale: 'en' });
    await i18n.changeLanguage('en');
  });

  it('shows the persisted locale as the checked radio', () => {
    expect.assertions(2);
    useSettingsStore.setState({ locale: 'uk' });
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    expect(screen.getByRole('radio', { name: /Українська/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /English/i })).not.toBeChecked();
  });

  it('switches the store locale and re-renders the preview strip in Ukrainian', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    await user.click(screen.getByRole('radio', { name: /Українська/i }));

    await waitFor(() => expect(useSettingsStore.getState().locale).toBe('uk'));
    expect(await screen.findByText(/Мої лобі/)).toBeInTheDocument();
  });

  it('PATCHes the chosen locale to the user profile', async () => {
    expect.assertions(1);
    let receivedBody: unknown;
    server.use(
      http.patch(`${BASE}/users/:id`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ ...testUser, locale: 'uk' });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    await user.click(screen.getByRole('radio', { name: /Українська/i }));

    await waitFor(() => expect(receivedBody).toEqual({ locale: 'uk' }));
  });

  it('keeps the switch applied locally even when the PATCH fails', async () => {
    expect.assertions(2);
    server.use(http.patch(`${BASE}/users/:id`, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    await user.click(screen.getByRole('radio', { name: /Українська/i }));

    await waitFor(() => expect(useSettingsStore.getState().locale).toBe('uk'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('does not PATCH when there is no signed-in user yet', async () => {
    expect.assertions(2);
    let patchCalled = false;
    server.use(
      http.patch(`${BASE}/users/:id`, () => {
        patchCalled = true;
        return HttpResponse.json(testUser);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={undefined} />);

    await user.click(screen.getByRole('radio', { name: /Українська/i }));

    await waitFor(() => expect(useSettingsStore.getState().locale).toBe('uk'));
    expect(patchCalled).toBe(false);
  });
});
