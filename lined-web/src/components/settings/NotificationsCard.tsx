import type { NotificationPreferencesDto } from '@/types';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotifications';
import { ToggleRow } from '@/components/ToggleRow';
import { SettingsCard } from './SettingsCard';

const TOGGLES: {
  key: keyof NotificationPreferencesDto;
  label: string;
  description: string;
}[] = [
  {
    key: 'sharedEventsEnabled',
    label: 'New shared events',
    description: 'Notify when a lobby member adds a shared event',
  },
  {
    key: 'taskAssignedEnabled',
    label: 'Task assigned to me',
    description: 'Alert when someone assigns a task to you',
  },
  {
    key: 'freeSlotsEnabled',
    label: 'Free slot detected',
    description: 'Notify when a free time slot opens up for your lobbies',
  },
  {
    key: 'eventRemindersEnabled',
    label: 'Event reminders',
    description: 'Reminders 30 minutes before an event',
  },
  {
    key: 'emailDigestsEnabled',
    label: 'Email digests',
    description: 'Weekly summary of shared activity',
  },
];

export const NotificationsCard = () => {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  if (isLoading || !preferences) {
    return (
      <SettingsCard id="notifications" title="Notifications">
        <div className="space-y-3 py-4" data-testid="notifications-card-loading">
          {TOGGLES.map((t) => (
            <div key={t.key} className="h-10 animate-pulse rounded-lg bg-bg" />
          ))}
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="notifications" title="Notifications">
      {TOGGLES.map((t) => (
        <ToggleRow
          key={t.key}
          label={t.label}
          description={t.description}
          checked={preferences[t.key]}
          onChange={(checked) => updatePreferences.mutate({ [t.key]: checked })}
        />
      ))}
      {updatePreferences.isError && (
        <p role="alert" className="pb-4 pt-1 text-xs text-red-600">
          Could not save that preference — please try again
        </p>
      )}
    </SettingsCard>
  );
};
