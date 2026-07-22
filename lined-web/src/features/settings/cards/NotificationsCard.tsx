import { useTranslation } from 'react-i18next';
import type { NotificationPreferencesDto } from '@/features/notifications/model';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications/hooks/useNotifications';
import { ToggleRow } from '@/components/ToggleRow';
import { SettingsCard } from '../SettingsCard';

const TOGGLE_KEYS: {
  key: keyof NotificationPreferencesDto;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    key: 'sharedEventsEnabled',
    labelKey: 'notifications.sharedEvents',
    descriptionKey: 'notifications.sharedEventsDescription',
  },
  {
    key: 'taskAssignedEnabled',
    labelKey: 'notifications.taskAssigned',
    descriptionKey: 'notifications.taskAssignedDescription',
  },
  {
    key: 'freeSlotsEnabled',
    labelKey: 'notifications.freeSlots',
    descriptionKey: 'notifications.freeSlotsDescription',
  },
  {
    key: 'eventRemindersEnabled',
    labelKey: 'notifications.eventReminders',
    descriptionKey: 'notifications.eventRemindersDescription',
  },
  {
    key: 'emailDigestsEnabled',
    labelKey: 'notifications.emailDigests',
    descriptionKey: 'notifications.emailDigestsDescription',
  },
];

export const NotificationsCard = () => {
  const { t } = useTranslation('settings');
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  if (isLoading || !preferences) {
    return (
      <SettingsCard id="notifications" title={t('notifications.title')}>
        <div className="space-y-3 py-4" data-testid="notifications-card-loading">
          {TOGGLE_KEYS.map((toggle) => (
            <div key={toggle.key} className="h-10 animate-pulse rounded-lg bg-bg" />
          ))}
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="notifications" title={t('notifications.title')}>
      {TOGGLE_KEYS.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={t(toggle.labelKey)}
          description={t(toggle.descriptionKey)}
          checked={preferences[toggle.key]}
          onChange={(checked) => updatePreferences.mutate({ [toggle.key]: checked })}
        />
      ))}
      {updatePreferences.isError && (
        <p role="alert" className="pb-4 pt-1 text-xs text-red-600 dark:text-red-400">
          {t('notifications.saveError')}
        </p>
      )}
    </SettingsCard>
  );
};
