import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { useSettingsStore } from '@/store/settings';
import { AppearanceCard } from '../AppearanceCard';

describe('AppearanceCard', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'system' });
  });

  it('defaults the theme select to the stored value', () => {
    expect.assertions(1);
    useSettingsStore.setState({ theme: 'light' });
    renderWithProviders(<AppearanceCard />);

    expect(screen.getByLabelText('Theme')).toHaveValue('light');
  });

  it('persists the selected theme to the store', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    renderWithProviders(<AppearanceCard />);

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark');

    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('reflects a switch back to light in the select value', async () => {
    expect.assertions(1);
    useSettingsStore.setState({ theme: 'dark' });
    const user = userEvent.setup();
    renderWithProviders(<AppearanceCard />);

    await user.selectOptions(screen.getByLabelText('Theme'), 'light');

    expect(screen.getByLabelText('Theme')).toHaveValue('light');
  });
});
