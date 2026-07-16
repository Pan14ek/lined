import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders as render, screen, userEvent } from '@/test/utils';
import { ROLES, TEST_IDS, CONFIRM_DIALOG_TEXT, MEMBER_CARD_TEXT } from '@/test/lobbyMemberContent';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders the title, message, and confirm label', () => {
    expect.assertions(3);
    render(
      <ConfirmDialog
        title="Remove member"
        message="Remove @nastia_k from this lobby?"
        confirmLabel={MEMBER_CARD_TEXT.removeButtonName}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Remove member')).toBeInTheDocument();
    expect(screen.getByText('Remove @nastia_k from this lobby?')).toBeInTheDocument();
    expect(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    expect.assertions(1);
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Make owner"
        message="Make this member the owner?"
        confirmLabel={MEMBER_CARD_TEXT.makeOwnerButtonName}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole(ROLES.button, { name: MEMBER_CARD_TEXT.makeOwnerButtonName }));

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
        confirmLabel={MEMBER_CARD_TEXT.removeButtonName}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole(ROLES.button, { name: CONFIRM_DIALOG_TEXT.cancelButtonName }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button and shows a pending label while isPending is true', () => {
    expect.assertions(2);
    render(
      <ConfirmDialog
        title="Remove member"
        message="Are you sure?"
        confirmLabel={MEMBER_CARD_TEXT.removeButtonName}
        isPending
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole(ROLES.button, { name: CONFIRM_DIALOG_TEXT.pleaseWaitLabel }),
    ).toBeDisabled();
    expect(
      screen.queryByRole(ROLES.button, { name: MEMBER_CARD_TEXT.removeButtonName }),
    ).not.toBeInTheDocument();
  });

  it('renders an inline error message when provided', () => {
    expect.assertions(1);
    render(
      <ConfirmDialog
        title="Remove member"
        message="Are you sure?"
        confirmLabel={MEMBER_CARD_TEXT.removeButtonName}
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
        confirmLabel={MEMBER_CARD_TEXT.removeButtonName}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByTestId(TEST_IDS.confirmDialogBackdrop));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
