import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useDeleteAccount } from '@/features/users/hooks/useUserSettings';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface DangerZoneCardProps {
  userId: number | undefined;
}

const getDeleteErrorMessage = (error: unknown, t: TFunction<'settings'>): string => {
  return getApiErrorMessage(
    error,
    { 409: t('dangerZone.errorOwnsLobbies') },
    t('dangerZone.errorGeneric'),
  );
}

export const DangerZoneCard = ({ userId }: DangerZoneCardProps) => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const setUserId = useAuthStore((s) => s.setUserId);
  const deleteAccount = useDeleteAccount(userId ?? 0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirm = () => {
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
      className="mb-5 scroll-mt-6 overflow-hidden rounded-xl border-[1.5px] border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
    >
      <div className="border-b border-red-200 px-6 py-3.5 text-sm font-bold text-red-600 dark:border-red-900/50 dark:text-red-400">
        ⚠ {t('dangerZone.title')}
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-sm font-semibold text-text-primary">{t('dangerZone.deleteAccount')}</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {t('dangerZone.deleteAccountDescription')}
          </div>
        </div>
        <button
          type="button"
          disabled={userId == null}
          onClick={() => setIsConfirmOpen(true)}
          className="h-9 flex-shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {t('dangerZone.deleteAccountButton')}
        </button>
      </div>

      {isConfirmOpen && (
        <ConfirmDialog
          title={t('dangerZone.deleteAccount')}
          message={t('dangerZone.deleteAccountDescription')}
          confirmLabel={t('dangerZone.deleteAccountButton')}
          danger
          isPending={deleteAccount.isPending}
          error={deleteAccount.isError ? getDeleteErrorMessage(deleteAccount.error, t) : null}
          onConfirm={handleConfirm}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </section>
  );
};
