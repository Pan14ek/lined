import { useTranslation } from 'react-i18next';
import type { LobbyNotificationPreferencesDto } from '@/features/notifications/model';
import {
  useLobbyNotificationPreferences,
  useUpdateLobbyNotificationPreferences,
} from '@/features/notifications/hooks/useNotifications';
import { ToggleRow } from '@/components/ToggleRow';
import { SettingsCard } from '@/features/settings/SettingsCard';

const TOGGLES: {
  key: keyof Omit<LobbyNotificationPreferencesDto, 'lobbyId'>;
  labelKey: 'settings.notifications.newEvents' | 'settings.notifications.taskUpdates' | 'settings.notifications.freeSlots';
}[] = [
  { key: 'newEventsEnabled', labelKey: 'settings.notifications.newEvents' },
  { key: 'taskUpdatesEnabled', labelKey: 'settings.notifications.taskUpdates' },
  { key: 'freeSlotsEnabled', labelKey: 'settings.notifications.freeSlots' },
];

interface LobbyNotificationsCardProps {
  lobbyId: number;
}

export const LobbyNotificationsCard = ({ lobbyId }: LobbyNotificationsCardProps) => {
  const { t } = useTranslation('lobby');
  const { data: preferences, isLoading } = useLobbyNotificationPreferences(lobbyId);
  const updatePreferences = useUpdateLobbyNotificationPreferences(lobbyId);

  if (isLoading || !preferences) {
    return (
      <SettingsCard id="lobby-notifications" title={t('settings.notifications.title')}>
        <div className="space-y-3 py-4" data-testid="lobby-notifications-card-loading">
          {TOGGLES.map((toggle) => (
            <div key={toggle.key} className="h-10 animate-pulse rounded-lg bg-bg" />
          ))}
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="lobby-notifications" title={t('settings.notifications.title')}>
      {TOGGLES.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={t(toggle.labelKey)}
          checked={preferences[toggle.key]}
          onChange={(checked) => updatePreferences.mutate({ [toggle.key]: checked })}
        />
      ))}
      {updatePreferences.isError && (
        <p role="alert" className="pb-4 pt-1 text-xs text-red-600 dark:text-red-400">
          {t('settings.notifications.saveError')}
        </p>
      )}
    </SettingsCard>
  );
};
