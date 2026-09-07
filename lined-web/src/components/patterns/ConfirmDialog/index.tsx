import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/design-system/overlays/Dialog';
import { Button } from '@/components/design-system/actions/Button';
import { TextField } from '@/components/design-system/forms/TextField';
import { Alert } from '@/components/design-system/feedback/Alert';

export interface ConfirmDialogConfirmationText {
  /** The exact text the user must type before the confirm button is enabled. */
  expected: string;
  label: ReactNode;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  tone?: 'default' | 'danger';
  loading?: boolean;
  error?: ReactNode;
  /** Requires the user to type an exact string before the confirm button is enabled. */
  confirmationText?: ConfirmDialogConfirmationText;
  onConfirm: () => void;
}

/**
 * Purpose: high-level "are you sure?" prompt, built on `Dialog` + `Button` +
 * `TextField` + `Alert`.
 *
 * When to use: any destructive or hard-to-reverse action (delete, leave,
 * cancel a subscription).
 *
 * When not to use: a full workflow with multiple fields — use `Dialog` directly.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  loading = false,
  error,
  confirmationText,
  onConfirm,
}: ConfirmDialogProps) => {
  const { t } = useTranslation('common');
  const [typedText, setTypedText] = useState('');
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTypedText('');
  }

  const isConfirmDisabled = loading || (confirmationText != null && typedText !== confirmationText.expected);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel ?? t('confirmDialog.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'destructive' : 'primary'} onClick={onConfirm} disabled={isConfirmDisabled} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {confirmationText && (
          <TextField
            label={confirmationText.label}
            value={typedText}
            onValueChange={setTypedText}
            autoFocus
          />
        )}
        {error && (
          <Alert tone="danger" icon={null}>
            {error}
          </Alert>
        )}
      </div>
    </Dialog>
  );
};
