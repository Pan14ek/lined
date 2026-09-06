import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { LobbyType } from '@/features/lobby/model';
import { useCreateLobby } from '@/features/lobby/hooks/useLobbies';
import { LobbyTypePicker } from '@/features/lobby/settings/LobbyTypePicker';
import { Button } from '@/components/design-system/actions/Button';
import { TextField } from '@/components/design-system/forms/TextField';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { useCreateMenuStore } from '@/store/createMenu';

interface CreateLobbyModalProps {
  onClose: () => void;
}

export const CreateLobbyModal = ({ onClose }: CreateLobbyModalProps) => {
  const { t } = useTranslation('lobby');
  const navigate = useNavigate();
  const createLobby = useCreateLobby();
  const lobbyTypeInitial = useCreateMenuStore((s) => s.lobbyTypeInitial);

  const [name, setName] = useState('');
  const [lobbyType, setLobbyType] = useState<LobbyType>(lobbyTypeInitial ?? 'COUPLE');

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        createLobby.mutate(
          { name: name.trim(), lobbyType },
          {
            onSuccess: (lobby) => {
              onClose();
              navigate(`/lobbies/${lobby.id}`);
            },
          },
        );
      }

  return (
    /* Backdrop */
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog — full-screen sheet under md, centered card at md and above */}
      <div className="flex h-full w-full flex-col overflow-y-auto bg-surface md:h-auto md:max-h-[90vh] md:w-[460px] md:max-w-[90vw] md:flex-none md:rounded-2xl md:shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-text-primary">{t('createModal.title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('createModal.close')}
            className="text-text-muted hover:text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Name */}
            <TextField
              id="create-lobby-name"
              label={t('createModal.nameLabel')}
              type="text"
              required
              value={name}
              onValueChange={setName}
              placeholder={t('createModal.namePlaceholder')}
            />

            {/* Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('createModal.typeLabel')}
              </label>
              <LobbyTypePicker value={lobbyType} onChange={setLobbyType} />
            </div>

            {createLobby.isError && (
              <AuthAlert message={getCreateLobbyErrorMessage(createLobby.error, t)} />
            )}

            {/* Hint */}
            <div className="rounded-lg bg-bg px-3.5 py-3 text-xs text-text-secondary">
              {t('createModal.ownerHint')}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
            <Button variant="secondary" onClick={onClose}>
              {t('createModal.cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim()} loading={createLobby.isPending}>
              {t('createModal.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const getCreateLobbyErrorMessage = (error: unknown, t: TFunction<'lobby'>): string => {
  return getApiErrorMessage(
    error,
    { 400: t('createModal.invalidName') },
    t('createModal.genericError'),
  );
}
