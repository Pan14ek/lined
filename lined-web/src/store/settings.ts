import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Locale = 'en' | 'uk';

const detectLocale = (): Locale => {
  return navigator.language.toLowerCase().startsWith('uk') ? 'uk' : 'en';
};

interface SettingsState {
  /** UI-only preference — no backend field exists for this yet. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Mirrors `UserDto.locale` once the backend field ships (mock-only until then). */
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      locale: detectLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'lined-settings' },
  ),
);
