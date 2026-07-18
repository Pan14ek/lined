import { useEffect } from 'react';
import { useSettingsStore, type Theme } from '@/store/settings';

const DARK_META_COLOR = '#0B1310';
const LIGHT_META_COLOR = '#F4F4F7';

const resolvesToDark = (theme: Theme, media: MediaQueryList): boolean => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return media.matches;
};

const applyResolvedTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = isDark ? DARK_META_COLOR : LIGHT_META_COLOR;
};

/**
 * Applies the persisted theme preference to `<html>` for the lifetime of the
 * app (not just while Settings is mounted), and keeps "System" live-synced
 * to OS theme changes via matchMedia.
 */
export const useThemeSync = () => {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    applyResolvedTheme(resolvesToDark(theme, media));

    if (theme !== 'system') return;
    const listener = () => applyResolvedTheme(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);
};
