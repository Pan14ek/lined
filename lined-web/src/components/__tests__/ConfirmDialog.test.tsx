import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders as render, screen, userEvent } from '@/test/utils';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders the title, message, and confirm label', () => {
    expect.assertions(3);
    render(
      <ConfirmDialog
        title="Remove member"
        message="Remove @nastia_k from this lobby?"
        confirmLabel="Remove"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Remove member')).toBeInTheDocument();
    expect(screen.getByText('Remove @nastia_k from this lobby?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Make owner"
        message="Make this member the owner?"
        confirmLabel="Make owner"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Make owner' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Remove member"
        message="Are you sure?"
        confirmLabel="Remove"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button and shows a pending label while isPending is true', () => {
    expect.assertions(2);
    render(
      <ConfirmDialog
        title="Remove member"
        message="Are you sure?"
        confirmLabel="Remove"
        isPending
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('renders an inline error message when provided', () => {
    expect.assertions(1);
    render(
      <ConfirmDialog
        title="Remove member"
        message="Are you sure?"
        confirmLabel="Remove"
        error="Could not remove this member — please try again"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Could not remove this member — please try again'),
    ).toBeInTheDocument();
  });

  it('calls onCancel when the backdrop is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Remove member"
        message="Are you sure?"
        confirmLabel="Remove"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByTestId('confirm-dialog-backdrop'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
