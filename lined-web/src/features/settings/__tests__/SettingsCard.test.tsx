import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { SettingsCard } from '../SettingsCard';

describe('SettingsCard', () => {
  it('renders the title, id, and children', () => {
    expect.assertions(3);
    const { container } = renderWithProviders(
      <SettingsCard id="profile" title="Profile">
        <p>Card body</p>
      </SettingsCard>,
    );

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Card body')).toBeInTheDocument();
    expect(container.querySelector('#profile')).toBeInTheDocument();
  });

  it('renders a footer when given', () => {
    expect.assertions(1);
    renderWithProviders(
      <SettingsCard id="profile" title="Profile" footer={<button type="button">Save</button>}>
        <p>Card body</p>
      </SettingsCard>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('omits the footer section when none is given', () => {
    expect.assertions(1);
    renderWithProviders(
      <SettingsCard id="profile" title="Profile">
        <p>Card body</p>
      </SettingsCard>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
