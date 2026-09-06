import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/utils';
import { ConfirmDialog } from '..';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    expect.assertions(1);
    renderWithProviders(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Remove member"
        description="Remove @nastia_k from this lobby?"
        confirmLabel="Remove"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title, description, and confirm label when open', () => {
    expect.assertions(3);
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Remove member"
        description="Remove @nastia_k from this lobby?"
        confirmLabel="Remove"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Remove member' })).toBeInTheDocument();
    expect(screen.getByText('Remove @nastia_k from this lobby?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    expect.assertions(1);
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Remove member"
        description="Are you sure?"
        confirmLabel="Remove"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    expect.assertions(1);
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Remove member"
        description="Are you sure?"
        confirmLabel="Remove"
        onConfirm={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables the confirm button and shows a spinner while loading', () => {
    expect.assertions(2);
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Remove member"
        description="Are you sure?"
        confirmLabel="Remove"
        loading
        onConfirm={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Remove' });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');
  });

  it('renders an inline error when provided', () => {
    expect.assertions(1);
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Remove member"
        description="Are you sure?"
        confirmLabel="Remove"
        error="Could not remove this member — please try again"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Could not remove this member — please try again')).toBeInTheDocument();
  });

  it('disables the confirm button until the typed confirmation text matches exactly', async () => {
    expect.assertions(3);
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete lobby"
        description="This cannot be undone."
        confirmLabel="Delete lobby"
        tone="danger"
        confirmationText={{ expected: 'Design Team', label: 'Type "Design Team" to confirm' }}
        onConfirm={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Delete lobby' });
    const input = screen.getByLabelText('Type "Design Team" to confirm');
    expect(confirmButton).toBeDisabled();

    await user.type(input, 'Design');
    expect(confirmButton).toBeDisabled();

    await user.type(input, ' Team');
    expect(confirmButton).toBeEnabled();
  });
});
