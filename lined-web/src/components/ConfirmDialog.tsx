interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isPending?: boolean;
  error?: string | null;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-[400px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-[var(--shadow-lg)]">
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>

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
            disabled={isPending}
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
