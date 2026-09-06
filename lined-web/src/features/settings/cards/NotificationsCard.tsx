import { useTranslation } from 'react-i18next';
import type { NotificationPreferencesDto } from '@/features/notifications/model';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications/hooks/useNotifications';
import { SwitchField } from '@/components/patterns/SwitchField';
import { ErrorState } from '@/components/patterns/ErrorState';
import { SkeletonRow } from '@/components/skeletons/SkeletonRow';
import { useQueryStall } from '@/hooks/useQueryStall';
import { SettingsCard } from '../SettingsCard';

const TOGGLE_KEYS: {
  key: keyof NotificationPreferencesDto;
  labelKey:
    | 'notifications.sharedEvents'
    | 'notifications.taskAssigned'
    | 'notifications.freeSlots'
    | 'notifications.eventReminders'
    | 'notifications.emailDigests';
  descriptionKey:
    | 'notifications.sharedEventsDescription'
    | 'notifications.taskAssignedDescription'
    | 'notifications.freeSlotsDescription'
    | 'notifications.eventRemindersDescription'
    | 'notifications.emailDigestsDescription';
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
  const { data: preferences, isLoading, isError, refetch } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const isStalled = useQueryStall(isLoading);

  if (isStalled || (!isLoading && isError)) {
    return (
      <SettingsCard id="notifications" title={t('notifications.title')}>
        <ErrorState onRetry={() => void refetch()} title={t('notifications.loadError')} />
      </SettingsCard>
    );
  }

  if (isLoading || !preferences) {
    return (
      <SettingsCard id="notifications" title={t('notifications.title')}>
        <div className="space-y-3 py-4" data-testid="notifications-card-loading">
          {TOGGLE_KEYS.map((toggle) => (
            <SkeletonRow key={toggle.key} className="h-10" />
          ))}
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="notifications" title={t('notifications.title')}>
      {TOGGLE_KEYS.map((toggle) => (
        <SwitchField
          key={toggle.key}
          label={t(toggle.labelKey)}
          description={t(toggle.descriptionKey)}
          checked={preferences[toggle.key]}
          onCheckedChange={(checked) => updatePreferences.mutate({ [toggle.key]: checked })}
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
