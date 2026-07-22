import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { LobbyDto, LobbyType } from '@/features/lobby/model';
import { useUpdateLobby } from '@/features/lobby/hooks/useLobbies';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { LobbyTypePicker } from './LobbyTypePicker';
import { SettingsCard } from '@/features/settings/SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from '@/features/settings/SettingsRow';

interface LobbyGeneralCardProps {
  lobby: LobbyDto;
  isOwner: boolean;
}

const getLobbyUpdateErrorMessage = (error: unknown, t: TFunction<'lobby'>): string => {
  return getApiErrorMessage(
    error,
    {
      403: t('settings.general.forbiddenError'),
      400: t('settings.general.invalidNameError'),
    },
    t('settings.general.genericError'),
  );
}

export const LobbyGeneralCard = ({ lobby, isOwner }: LobbyGeneralCardProps) => {
  const { t } = useTranslation('lobby');
  const updateLobby = useUpdateLobby(lobby.id);
  const [loadedLobbyId, setLoadedLobbyId] = useState<number | undefined>(undefined);
  const [name, setName] = useState('');
  const [lobbyType, setLobbyType] = useState<LobbyType>(lobby.lobbyType);

  // Seed the form once the lobby loads (render-time state adjustment — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (lobby.id !== loadedLobbyId) {
    setLoadedLobbyId(lobby.id);
    setName(lobby.name);
    setLobbyType(lobby.lobbyType);
  }

  const isDirty = name.trim() !== lobby.name || lobbyType !== lobby.lobbyType;

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner || !isDirty) return;
        updateLobby.mutate({
          ...(name.trim() !== lobby.name ? { name: name.trim() } : {}),
          ...(lobbyType !== lobby.lobbyType ? { lobbyType } : {}),
        });
      }

  return (
    <SettingsCard
      id="general"
      title={t('settings.general.title')}
      footer={
        isOwner ? (
          <button
            type="submit"
            form="lobby-general-form"
            disabled={!isDirty || updateLobby.isPending}
            className="h-[38px] rounded-lg bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
          >
            {updateLobby.isPending ? t('settings.general.saving') : t('settings.general.save')}
          </button>
        ) : undefined
      }
    >
      <form id="lobby-general-form" onSubmit={handleSubmit}>
        <SettingsRow label={t('settings.general.nameLabel')}>
          <input
            aria-label={t('settings.general.nameLabel')}
            className={SETTINGS_INPUT_CLASS}
            value={name}
            disabled={!isOwner}
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsRow>
        <div className="border-b border-border py-3.5">
          <div className="text-sm font-medium text-text-secondary">{t('settings.general.typeLabel')}</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {t('settings.general.typeHint')}
          </div>
        </div>
        <div className="pb-4 pt-4">
          <fieldset disabled={!isOwner}>
            <LobbyTypePicker value={lobbyType} onChange={setLobbyType} />
          </fieldset>
        </div>
      </form>

      {updateLobby.isError && (
        <p role="alert" className="pb-4 text-xs text-red-600 dark:text-red-400">
          {getLobbyUpdateErrorMessage(updateLobby.error, t)}
        </p>
      )}
    </SettingsCard>
  );
};
