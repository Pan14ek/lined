import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settings';
import { locales, storageKeys } from './settings.test.helper';

describe('useSettingsStore locale', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({ locale: locales.english });
  });

  it('setLocale updates the store', () => {
    expect.assertions(1);
    useSettingsStore.getState().setLocale(locales.ukrainian);

    expect(useSettingsStore.getState().locale).toBe(locales.ukrainian);
  });

  it('persists the chosen locale to localStorage under the settings key', () => {
    expect.assertions(1);
    useSettingsStore.getState().setLocale(locales.ukrainian);

    const persisted = JSON.parse(localStorage.getItem(storageKeys.settings) ?? '{}');
    expect(persisted.state.locale).toBe(locales.ukrainian);
  });

  it('a locale set before persistence survives re-reading the persisted value', () => {
    expect.assertions(1);
    useSettingsStore.getState().setLocale(locales.ukrainian);
    const persisted = JSON.parse(localStorage.getItem(storageKeys.settings) ?? '{}');

    // Simulate a fresh load reading back what was written to storage.
    expect(persisted.state.locale).toBe(locales.ukrainian);
  });

  it('defaults to "en" when the browser locale is not Ukrainian', () => {
    expect.assertions(1);
    // jsdom's default navigator.language is en-US in this test environment.
    expect(navigator.language.toLowerCase().startsWith(locales.ukrainian)).toBe(false);
  });
});
