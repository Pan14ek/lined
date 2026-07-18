import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { SettingsMenu } from '@/features/settings/SettingsMenu';
import { ProfileCard } from '@/features/settings/cards/ProfileCard';
import { PasswordCard } from '@/features/settings/cards/PasswordCard';
import { NotificationsCard } from '@/features/settings/cards/NotificationsCard';
import { AppearanceCard } from '@/features/settings/cards/AppearanceCard';
import { DangerZoneCard } from '@/features/settings/cards/DangerZoneCard';

export const UserSettingsPage = () => {
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
