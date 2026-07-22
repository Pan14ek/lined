import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useSettingsStore } from '@/store/settings';
import en from './locales/en';
import uk from './locales/uk';

export const NAMESPACES = [
  'common',
  'auth',
  'dashboard',
  'calendar',
  'tasks',
  'lobby',
  'settings',
  'subscription',
  'notifications',
] as const;

export const DEFAULT_NS = 'common';

void i18next.use(initReactI18next).init({
  resources: { en, uk },
  lng: useSettingsStore.getState().locale,
  fallbackLng: 'en',
  defaultNS: DEFAULT_NS,
  ns: NAMESPACES,
  interpolation: { escapeValue: false },
});

document.documentElement.lang = useSettingsStore.getState().locale;

// Keep i18next and <html lang> in sync with the persisted/store locale for
// the lifetime of the app (store changes can come from the settings page,
// or from rehydrating a persisted choice on load).
useSettingsStore.subscribe((state, prevState) => {
  if (state.locale === prevState.locale) return;
  void i18next.changeLanguage(state.locale);
  document.documentElement.lang = state.locale;
});

export default i18next;
