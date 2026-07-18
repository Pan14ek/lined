import { useState } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isPending?: boolean;
  error?: string | null;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  confirmText?: string;
  confirmTextLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  danger = false,
  isPending = false,
  error,
  confirmText,
  confirmTextLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const [typedText, setTypedText] = useState('');
  const isConfirmDisabled =
    isPending || (confirmText != null && typedText !== confirmText);

  return (
    <div
      data-testid="confirm-dialog-backdrop"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-[400px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-[var(--shadow-lg)]">
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>

        {confirmText != null && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              {confirmTextLabel ?? `Type "${confirmText}" to confirm`}
            </label>
            <input
              aria-label={confirmTextLabel ?? `Type "${confirmText}" to confirm`}
              className="h-10 w-full rounded-lg border border-border bg-input-bg px-3 text-sm text-text-primary focus:border-brand-green focus:outline-none"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
            />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-border bg-white px-4 text-sm text-text-secondary hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`h-10 rounded-lg px-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-green hover:bg-brand-green-dark'
            }`}
          >
            {isPending ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
