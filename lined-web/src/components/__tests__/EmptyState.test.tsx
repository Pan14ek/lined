import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the icon and message', () => {
    expect.assertions(2);
    renderWithProviders(<EmptyState icon="📅" message="No events yet." />);

    expect(screen.getByText('📅')).toBeInTheDocument();
    expect(screen.getByText('No events yet.')).toBeInTheDocument();
  });

  it('renders no icon when none is given', () => {
    expect.assertions(1);
    const { container } = renderWithProviders(<EmptyState message="No events yet." />);

    expect(container.querySelector('span')).not.toBeInTheDocument();
  });

  it('calls onClick when the button action is clicked', async () => {
    expect.assertions(1);
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <EmptyState message="No lobbies yet" action={{ label: '+ Create lobby', onClick }} />,
    );

    await user.click(screen.getByRole('button', { name: '+ Create lobby' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a working router Link when the action has a "to" target', () => {
    expect.assertions(1);
    renderWithProviders(
      <EmptyState message="No tasks yet." action={{ label: 'Invite someone', to: '/lobbies/1?tab=members' }} />,
    );

    expect(screen.getByRole('link', { name: 'Invite someone' })).toHaveAttribute(
      'href',
      '/lobbies/1?tab=members',
    );
  });

  it('renders the inline variant as a single paragraph with the action inline', () => {
    expect.assertions(2);
    renderWithProviders(
      <EmptyState
        variant="inline"
        message="No lobbies yet"
        action={{ label: '+ New', onClick: () => undefined }}
        testId="sidebar-empty"
      />,
    );

    const el = screen.getByTestId('sidebar-empty');
    expect(el.tagName).toBe('P');
    expect(el).toHaveTextContent('No lobbies yet — + New');
  });

  it('renders the card variant with no action when none is given', () => {
    expect.assertions(2);
    renderWithProviders(<EmptyState message="No tasks in To Do." testId="kanban-empty" />);

    expect(screen.getByTestId('kanban-empty').tagName).toBe('DIV');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
