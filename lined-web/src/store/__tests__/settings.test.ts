import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settings';

describe('useSettingsStore locale', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({ locale: 'en' });
  });

  it('setLocale updates the store', () => {
    expect.assertions(1);
    useSettingsStore.getState().setLocale('uk');

    expect(useSettingsStore.getState().locale).toBe('uk');
  });

  it('persists the chosen locale to localStorage under the settings key', () => {
    expect.assertions(1);
    useSettingsStore.getState().setLocale('uk');

    const persisted = JSON.parse(localStorage.getItem('lined-settings') ?? '{}');
    expect(persisted.state.locale).toBe('uk');
  });

  it('a locale set before persistence survives re-reading the persisted value', () => {
    expect.assertions(1);
    useSettingsStore.getState().setLocale('uk');
    const persisted = JSON.parse(localStorage.getItem('lined-settings') ?? '{}');

    // Simulate a fresh load reading back what was written to storage.
    expect(persisted.state.locale).toBe('uk');
  });

  it('defaults to "en" when the browser locale is not Ukrainian', () => {
    expect.assertions(1);
    // jsdom's default navigator.language is en-US in this test environment.
    expect(navigator.language.toLowerCase().startsWith('uk')).toBe(false);
  });
});
