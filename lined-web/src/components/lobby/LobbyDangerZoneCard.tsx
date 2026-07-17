import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HTTPError } from 'ky';
import type { LobbyDto } from '@/types';
import { useRemoveMember, useDeleteLobby } from '@/hooks/useLobbies';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface LobbyDangerZoneCardProps {
  lobby: LobbyDto;
  currentUserId: number | undefined;
}

type PendingAction = 'leave' | 'delete' | null;

function getLeaveErrorMessage(error: unknown): string {
  if (error instanceof HTTPError && (error.response.status === 400 || error.response.status === 409)) {
    return "You're the lobby owner — transfer ownership or delete the lobby instead of leaving";
  }
  return 'Could not leave this lobby — please try again';
}

export const LobbyDangerZoneCard = ({ lobby, currentUserId }: LobbyDangerZoneCardProps) => {
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
      onError: (error) => setActionError(getLeaveErrorMessage(error)),
    });
  };

  const handleDelete = () => {
    setActionError(null);
    deleteLobby.mutate(lobby.id, {
      onSuccess: () => navigate('/'),
      onError: () => setActionError('Could not delete this lobby — please try again'),
    });
  };

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
          <div className="text-sm font-semibold text-text-primary">Leave lobby</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            You&apos;ll lose access to all shared events and tasks in this lobby.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPendingAction('leave')}
          className="h-9 flex-shrink-0 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          Leave
        </button>
      </div>
      {isOwner && (
        <div className="flex items-center justify-between border-t border-red-200 px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-text-primary">Delete lobby</div>
            <div className="mt-0.5 text-xs text-text-secondary">
              Permanently delete this lobby and all its content. Only the owner can do this.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingAction('delete')}
            className="h-9 flex-shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Delete lobby
          </button>
        </div>
      )}

      {pendingAction === 'leave' && (
        <ConfirmDialog
          title="Leave lobby"
          message={`Leave "${lobby.name}"? You'll lose access to all shared events and tasks.`}
          confirmLabel="Leave"
          danger
          isPending={removeMember.isPending}
          error={actionError}
          onConfirm={handleLeave}
          onCancel={closeDialog}
        />
      )}

      {pendingAction === 'delete' && (
        <ConfirmDialog
          title="Delete lobby"
          message={`Permanently delete "${lobby.name}" and all its content. This cannot be undone.`}
          confirmLabel="Delete lobby"
          danger
          confirmText={lobby.name}
          isPending={deleteLobby.isPending}
          error={actionError}
          onConfirm={handleDelete}
          onCancel={closeDialog}
        />
      )}
    </section>
  );
};
