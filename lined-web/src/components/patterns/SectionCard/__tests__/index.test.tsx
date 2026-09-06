import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { SectionCard } from '..';

describe('SectionCard', () => {
  it('renders the title and body content', () => {
    expect.assertions(2);
    renderWithProviders(
      <SectionCard title="Profile" id="profile">
        Body content
      </SectionCard>,
    );

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('omits the header entirely when there is no title or action', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<SectionCard>Body only</SectionCard>);

    expect(container.querySelector('.border-b')).not.toBeInTheDocument();
  });

  it('renders the footer when provided', () => {
    expect.assertions(1);
    renderWithProviders(
      <SectionCard title="Danger zone" footer={<button type="button">Delete account</button>}>
        Body
      </SectionCard>,
    );

    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
  });
});
