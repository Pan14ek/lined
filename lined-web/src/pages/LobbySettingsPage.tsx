import { useParams } from 'react-router-dom';

export function LobbySettingsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-2xl font-semibold text-text-primary">
        Lobby Settings
      </h2>
      <p className="mt-2 text-text-secondary">
        Settings for lobby #{id} coming soon...
      </p>
    </div>
  );
}
