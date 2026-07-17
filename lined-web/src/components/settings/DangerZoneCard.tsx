import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteAccount } from '@/hooks/useUserSettings';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface DangerZoneCardProps {
  userId: number | undefined;
}

function getDeleteErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    { 409: 'You still own one or more lobbies — transfer ownership or delete them first' },
    'Could not delete your account — please try again',
  );
}

export const DangerZoneCard = ({ userId }: DangerZoneCardProps) => {
  const navigate = useNavigate();
  const setUserId = useAuthStore((s) => s.setUserId);
  const deleteAccount = useDeleteAccount(userId ?? 0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function handleConfirm() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setUserId(null);
        navigate('/sign-in');
      },
    });
  }

  return (
    <section
      id="danger-zone"
      className="mb-5 scroll-mt-6 overflow-hidden rounded-xl border-[1.5px] border-red-200 bg-red-50"
    >
      <div className="border-b border-red-200 px-6 py-3.5 text-sm font-bold text-red-600">
        ⚠ Danger Zone
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-sm font-semibold text-text-primary">Delete my account</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            Permanently remove your account and all data. This cannot be undone.
          </div>
        </div>
        <button
          type="button"
          disabled={userId == null}
          onClick={() => setIsConfirmOpen(true)}
          className="h-9 flex-shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          Delete account
        </button>
      </div>

      {isConfirmOpen && (
        <ConfirmDialog
          title="Delete account"
          message="Permanently remove your account and all data. This cannot be undone."
          confirmLabel="Delete account"
          danger
          isPending={deleteAccount.isPending}
          error={deleteAccount.isError ? getDeleteErrorMessage(deleteAccount.error) : null}
          onConfirm={handleConfirm}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </section>
  );
};
