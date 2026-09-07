import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { EmptyState } from '..';

describe('EmptyState', () => {
  it('renders the icon and title', () => {
    expect.assertions(2);
    renderWithProviders(<EmptyState icon="📅" title="No events yet." />);

    expect(screen.getByText('📅')).toBeInTheDocument();
    expect(screen.getByText('No events yet.')).toBeInTheDocument();
  });

  it('renders no icon when none is given', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<EmptyState title="No events yet." />);

    expect(container.querySelector('span')).not.toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    expect.assertions(1);
    renderWithProviders(<EmptyState title="No events yet." description="Create one to get started" />);

    expect(screen.getByText('Create one to get started')).toBeInTheDocument();
  });

  it('calls onClick when the button action is clicked', async () => {
    expect.assertions(1);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<EmptyState title="No lobbies yet" action={{ label: '+ Create lobby', onClick }} />);

    await user.click(screen.getByRole('button', { name: '+ Create lobby' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a working router Link when the action has a "to" target', () => {
    expect.assertions(1);
    renderWithProviders(
      <EmptyState title="No tasks yet." action={{ label: 'Invite someone', to: '/lobbies/1?tab=members' }} />,
    );

    expect(screen.getByRole('link', { name: 'Invite someone' })).toHaveAttribute(
      'href',
      '/lobbies/1?tab=members',
    );
  });

  it('renders the inline variant as a single paragraph with the action inline', () => {
    expect.assertions(2);
    renderWithProviders(
      <EmptyState variant="inline" title="No lobbies yet" action={{ label: '+ New', onClick: () => undefined }} />,
    );

    const el = screen.getByText(/No lobbies yet/);
    expect(el.tagName).toBe('P');
    expect(el).toHaveTextContent('No lobbies yet — + New');
  });

  it('renders the card variant with no action when none is given', () => {
    expect.assertions(2);
    const { container } = renderWithProviders(<EmptyState title="No tasks in To Do." />);

    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
