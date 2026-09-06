import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { LobbyDto } from '@/features/lobby/model';
import { useRemoveMember, useDeleteLobby } from '@/features/lobby/hooks/useLobbies';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';

interface LobbyDangerZoneCardProps {
  lobby: LobbyDto;
  currentUserId: number | undefined;
}

type PendingAction = 'leave' | 'delete' | null;

const getLeaveErrorMessage = (error: unknown, t: TFunction<'lobby'>): string => {
  const message = t('settings.dangerZone.leaveOwnerError');
  return getApiErrorMessage(error, { 400: message, 409: message }, t('settings.dangerZone.leaveGenericError'));
}

export const LobbyDangerZoneCard = ({ lobby, currentUserId }: LobbyDangerZoneCardProps) => {
  const { t } = useTranslation('lobby');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const removeMember = useRemoveMember(lobby.id);
  const deleteLobby = useDeleteLobby();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner = currentUserId != null && currentUserId === lobby.ownerId;

  const closeDialog = () => {
    setPendingAction(null);
    setActionError(null);
  };

  const handleLeave = () => {
    if (currentUserId == null) return;
    setActionError(null);
    removeMember.mutate(currentUserId, {
      onSuccess: () => navigate('/'),
      onError: (error) => setActionError(getLeaveErrorMessage(error, t)),
    });
  };

  const handleDelete = () => {
    setActionError(null);
    deleteLobby.mutate(lobby.id, {
      onSuccess: () => navigate('/'),
      onError: () => setActionError(t('settings.dangerZone.deleteError')),
    });
  };

  return (
    <section
      id="danger-zone"
      className="mb-5 scroll-mt-6 overflow-hidden rounded-xl border-[1.5px] border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
    >
      <div className="border-b border-red-200 px-6 py-3.5 text-sm font-bold text-red-600 dark:border-red-900/50 dark:text-red-400">
        {t('settings.dangerZone.heading')}
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-sm font-semibold text-text-primary">{t('settings.dangerZone.leaveTitle')}</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {t('settings.dangerZone.leaveDescription')}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPendingAction('leave')}
          className="h-9 flex-shrink-0 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {t('settings.dangerZone.leave')}
        </button>
      </div>
      {isOwner && (
        <div className="flex items-center justify-between border-t border-red-200 px-6 py-4 dark:border-red-900/50">
          <div>
            <div className="text-sm font-semibold text-text-primary">{t('settings.dangerZone.deleteTitle')}</div>
            <div className="mt-0.5 text-xs text-text-secondary">
              {t('settings.dangerZone.deleteDescription')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingAction('delete')}
            className="h-9 flex-shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {t('settings.dangerZone.delete')}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingAction === 'leave'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title={t('settings.dangerZone.leaveTitle')}
        description={t('settings.dangerZone.leaveConfirmMessage', { lobbyName: lobby.name })}
        confirmLabel={t('settings.dangerZone.leave')}
        tone="danger"
        loading={removeMember.isPending}
        error={actionError}
        onConfirm={handleLeave}
      />

      <ConfirmDialog
        open={pendingAction === 'delete'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title={t('settings.dangerZone.deleteTitle')}
        description={t('settings.dangerZone.deleteConfirmMessage', { lobbyName: lobby.name })}
        confirmLabel={t('settings.dangerZone.delete')}
        tone="danger"
        confirmationText={{ expected: lobby.name, label: tCommon('confirmDialog.typeToConfirm', { text: lobby.name }) }}
        loading={deleteLobby.isPending}
        error={actionError}
        onConfirm={handleDelete}
      />
    </section>
  );
};
