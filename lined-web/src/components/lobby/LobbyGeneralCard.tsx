import { useState } from 'react';
import type { LobbyDto, LobbyType } from '@/types';
import { useUpdateLobby } from '@/hooks/useLobbies';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { LobbyTypePicker } from '@/components/LobbyTypePicker';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from '@/components/settings/SettingsRow';

interface LobbyGeneralCardProps {
  lobby: LobbyDto;
  isOwner: boolean;
}

function getLobbyUpdateErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    {
      403: 'Only the lobby owner can update lobby settings',
      400: 'Enter a valid lobby name',
    },
    'Something went wrong — please try again',
  );
}

export const LobbyGeneralCard = ({ lobby, isOwner }: LobbyGeneralCardProps) => {
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

  function handleSubmit(e: React.FormEvent) {
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
      title="General"
      footer={
        isOwner ? (
          <button
            type="submit"
            form="lobby-general-form"
            disabled={!isDirty || updateLobby.isPending}
            className="h-[38px] rounded-lg bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
          >
            {updateLobby.isPending ? 'Saving…' : 'Save changes'}
          </button>
        ) : undefined
      }
    >
      <form id="lobby-general-form" onSubmit={handleSubmit}>
        <SettingsRow label="Lobby name">
          <input
            aria-label="Lobby name"
            className={SETTINGS_INPUT_CLASS}
            value={name}
            disabled={!isOwner}
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsRow>
        <div className="border-b border-border py-3.5">
          <div className="text-sm font-medium text-text-secondary">Lobby type</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            Determines how the lobby is labelled
          </div>
        </div>
        <div className="pb-4 pt-4">
          <fieldset disabled={!isOwner}>
            <LobbyTypePicker value={lobbyType} onChange={setLobbyType} />
          </fieldset>
        </div>
      </form>

      {updateLobby.isError && (
        <p role="alert" className="pb-4 text-xs text-red-600">
          {getLobbyUpdateErrorMessage(updateLobby.error)}
        </p>
      )}
    </SettingsCard>
  );
};
