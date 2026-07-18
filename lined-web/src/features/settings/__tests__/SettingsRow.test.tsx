import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { SettingsRow } from '../SettingsRow';

describe('SettingsRow', () => {
  it('renders the label, description, and control', () => {
    expect.assertions(3);
    renderWithProviders(
      <SettingsRow label="Username" description="Your public handle">
        <input aria-label="Username" />
      </SettingsRow>,
    );

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Your public handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('omits the description when none is given', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(
      <SettingsRow label="Username">
        <input aria-label="Username" />
      </SettingsRow>,
    );

    expect(container.querySelectorAll('.text-xs').length).toBe(0);
  });
});
