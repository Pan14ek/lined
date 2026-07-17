import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { MOCK_USERS } from '@/test/data';
import { useAuthStore } from '@/store/auth';
import { UserSettingsPage } from '../UserSettingsPage';

const user = MOCK_USERS[0]!;

describe('UserSettingsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: user.id });
  });

  it('renders the settings menu and all five section cards', async () => {
    expect.assertions(6);
    renderWithProviders(<UserSettingsPage />);

    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Username')).toHaveValue(user.username);
    expect(screen.getByRole('link', { name: 'Password & Security' })).toBeInTheDocument();
    expect(await screen.findByText('New shared events')).toBeInTheDocument();
    expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
  });
});
