import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsMenu } from '../SettingsMenu';

describe('SettingsMenu', () => {
  it('renders every account, preference, and danger item with an anchor link', () => {
    expect.assertions(6);
    render(<SettingsMenu />);

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '#profile');
    expect(screen.getByRole('link', { name: 'Password & Security' })).toHaveAttribute(
      'href',
      '#password',
    );
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '#notifications',
    );
    expect(screen.getByRole('link', { name: 'Appearance' })).toHaveAttribute(
      'href',
      '#appearance',
    );
    expect(screen.getByRole('link', { name: 'Delete Account' })).toHaveAttribute(
      'href',
      '#danger-zone',
    );
    expect(screen.getByText('DANGER')).toBeInTheDocument();
  });
});
