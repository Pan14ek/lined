import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SettingsMenu } from '@/components/settings/SettingsMenu';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { PasswordCard } from '@/components/settings/PasswordCard';
import { NotificationsCard } from '@/components/settings/NotificationsCard';
import { AppearanceCard } from '@/components/settings/AppearanceCard';
import { DangerZoneCard } from '@/components/settings/DangerZoneCard';

export function UserSettingsPage() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className="flex flex-1 overflow-hidden">
      <SettingsMenu />
      <div className="flex-1 overflow-y-auto bg-bg p-8">
        <ProfileCard user={user} isLoading={isLoading} />
        <PasswordCard userId={user?.id} />
        <NotificationsCard />
        <AppearanceCard />
        <DangerZoneCard userId={user?.id} />
      </div>
    </div>
  );
}
