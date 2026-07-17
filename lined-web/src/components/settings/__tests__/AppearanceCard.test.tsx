import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { useSettingsStore } from '@/store/settings';
import { AppearanceCard } from '../AppearanceCard';

describe('AppearanceCard', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'system' });
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('defaults the theme select to the stored value', () => {
    expect.assertions(1);
    useSettingsStore.setState({ theme: 'light' });
    renderWithProviders(<AppearanceCard />);

    expect(screen.getByLabelText('Theme')).toHaveValue('light');
  });

  it('persists the selected theme to the store and applies the dark class', async () => {
    expect.assertions(2);
    const user = userEvent.setup();
    renderWithProviders(<AppearanceCard />);

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark');

    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the dark class when switching to light', async () => {
    expect.assertions(1);
    useSettingsStore.setState({ theme: 'dark' });
    const user = userEvent.setup();
    renderWithProviders(<AppearanceCard />);

    await user.selectOptions(screen.getByLabelText('Theme'), 'light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
