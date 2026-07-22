import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { server } from '@/test/server';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useSettingsStore } from '@/store/settings';
import i18n from '@/i18n';
import { LanguageCard } from '../LanguageCard';
import { api, locales, roles, testIds, texts } from './LanguageCard.test.helper';
import { HTTP_STATUS } from '@/test/httpStatus';

const testUser = MOCK_USERS[0]!;

describe('LanguageCard', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: locales.english });
  });

  afterEach(async () => {
    useSettingsStore.setState({ locale: locales.english });
    await i18n.changeLanguage(locales.english);
  });

  it('shows the persisted locale as the checked radio', () => {
    expect.assertions(3);
    useSettingsStore.setState({ locale: locales.ukrainian });
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    expect(screen.getByRole(roles.radio, { name: texts.ukrainian })).toBeChecked();
    expect(screen.getByRole(roles.radio, { name: texts.english })).not.toBeChecked();
    expect(screen.getByText(texts.ukrainianDateExample)).toBeInTheDocument();
  });

  it('switches the store locale and re-renders the preview strip in Ukrainian', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    await user.click(screen.getByRole(roles.radio, { name: texts.ukrainian }));

    await waitFor(() => expect(useSettingsStore.getState().locale).toBe(locales.ukrainian));
    expect(await screen.findByTestId(testIds.preview)).toHaveTextContent(texts.ukrainianPreview);
  });

  it('PATCHes the chosen locale to the user profile', async () => {
    expect.assertions(1);
    let receivedBody: unknown;
    server.use(
      http.patch(`${api.baseUrl}/users/:id`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ ...testUser, locale: locales.ukrainian });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    await user.click(screen.getByRole(roles.radio, { name: texts.ukrainian }));

    await waitFor(() => expect(receivedBody).toEqual({ locale: locales.ukrainian }));
  });

  it('keeps the switch applied locally even when the PATCH fails', async () => {
    expect.assertions(2);
    server.use(http.patch(`${api.baseUrl}/users/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={testUser.id} />);

    await user.click(screen.getByRole(roles.radio, { name: texts.ukrainian }));

    await waitFor(() => expect(useSettingsStore.getState().locale).toBe(locales.ukrainian));
    expect(await screen.findByRole(roles.alert)).toBeInTheDocument();
  });

  it('does not PATCH when there is no signed-in user yet', async () => {
    expect.assertions(2);
    let patchCalled = false;
    server.use(
      http.patch(`${api.baseUrl}/users/:id`, () => {
        patchCalled = true;
        return HttpResponse.json(testUser);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LanguageCard userId={undefined} />);

    await user.click(screen.getByRole(roles.radio, { name: texts.ukrainian }));

    await waitFor(() => expect(useSettingsStore.getState().locale).toBe(locales.ukrainian));
    expect(patchCalled).toBe(false);
  });
});
