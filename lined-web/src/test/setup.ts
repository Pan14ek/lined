import '@testing-library/jest-dom/vitest';
import i18n from '@/i18n';
import { useSettingsStore } from '@/store/settings';
import { server } from './server';
import { afterAll, afterEach, beforeAll } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  server.resetHandlers();
  localStorage.clear();
  useSettingsStore.setState({ locale: 'en' });
  await i18n.changeLanguage('en');
});
afterAll(() => server.close());

// jsdom doesn't implement matchMedia — used by the "System" theme option.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
