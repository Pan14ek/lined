import type { LobbyNotificationPreferencesDto } from '@/features/notifications/model';
import {
  useLobbyNotificationPreferences,
  useUpdateLobbyNotificationPreferences,
} from '@/features/notifications/hooks/useNotifications';
import { ToggleRow } from '@/components/ToggleRow';
import { SettingsCard } from '@/features/settings/SettingsCard';

const TOGGLES: {
  key: keyof Omit<LobbyNotificationPreferencesDto, 'lobbyId'>;
  label: string;
}[] = [
  { key: 'newEventsEnabled', label: 'New events in this lobby' },
  { key: 'taskUpdatesEnabled', label: 'Task updates' },
  { key: 'freeSlotsEnabled', label: 'Free slot notifications' },
];

interface LobbyNotificationsCardProps {
  lobbyId: number;
}

export const LobbyNotificationsCard = ({ lobbyId }: LobbyNotificationsCardProps) => {
  const { data: preferences, isLoading } = useLobbyNotificationPreferences(lobbyId);
  const updatePreferences = useUpdateLobbyNotificationPreferences(lobbyId);

  if (isLoading || !preferences) {
    return (
      <SettingsCard id="lobby-notifications" title="Lobby Notifications">
        <div className="space-y-3 py-4" data-testid="lobby-notifications-card-loading">
          {TOGGLES.map((t) => (
            <div key={t.key} className="h-10 animate-pulse rounded-lg bg-bg" />
          ))}
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="lobby-notifications" title="Lobby Notifications">
      {TOGGLES.map((t) => (
        <ToggleRow
          key={t.key}
          label={t.label}
          checked={preferences[t.key]}
          onChange={(checked) => updatePreferences.mutate({ [t.key]: checked })}
        />
      ))}
      {updatePreferences.isError && (
        <p role="alert" className="pb-4 pt-1 text-xs text-red-600 dark:text-red-400">
          Could not save that preference — please try again
        </p>
      )}
    </SettingsCard>
  );
};
