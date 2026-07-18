import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsStore } from '@/store/settings';
import { useThemeSync } from '../useThemeSync';

type Listener = () => void;

const createMatchMediaMock = (initialMatches: boolean) => {
  let matches = initialMatches;
  const listeners = new Set<Listener>();

  const mql = {
    get matches() {
      return matches;
    },
    media: '',
    addEventListener: (_: string, listener: Listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_: string, listener: Listener) => {
      listeners.delete(listener);
    },
  };

  return {
    mql,
    setMatches: (value: boolean) => {
      matches = value;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
};

describe('useThemeSync', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'system' });
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    vi.restoreAllMocks();
  });

  it('applies the dark class and color-scheme when theme is dark', () => {
    expect.assertions(2);
    const { mql } = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
    useSettingsStore.setState({ theme: 'dark' });

    renderHook(() => useThemeSync());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes the dark class when theme is light', () => {
    expect.assertions(1);
    const { mql } = createMatchMediaMock(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
    useSettingsStore.setState({ theme: 'light' });
    document.documentElement.classList.add('dark');

    renderHook(() => useThemeSync());

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reacts live to a matchMedia change event while theme is system', () => {
    expect.assertions(2);
    const { mql, setMatches } = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
    useSettingsStore.setState({ theme: 'system' });

    renderHook(() => useThemeSync());
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      setMatches(true);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does not subscribe to matchMedia changes when theme is not system', () => {
    expect.assertions(1);
    const { mql, listenerCount } = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
    useSettingsStore.setState({ theme: 'dark' });

    renderHook(() => useThemeSync());

    expect(listenerCount()).toBe(0);
  });

  it('updates the theme-color meta tag to match the resolved theme', () => {
    expect.assertions(1);
    const { mql } = createMatchMediaMock(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
    useSettingsStore.setState({ theme: 'dark' });

    renderHook(() => useThemeSync());

    const meta = document.querySelector('meta[name="theme-color"]');
    expect(meta?.getAttribute('content')).toBe('#0B1310');
  });
});
