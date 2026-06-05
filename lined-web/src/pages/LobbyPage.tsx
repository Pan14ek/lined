import { useParams, useSearchParams } from 'react-router-dom';

export function LobbyPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'tasks';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-2xl font-semibold text-text-primary">
        Lobby #{id}
      </h2>
      <p className="mt-2 text-text-secondary">
        Active tab: <span className="font-medium">{tab}</span>
      </p>
      <p className="mt-1 text-text-muted">
        Lobby detail view with Tasks / Calendar / Members tabs coming soon...
      </p>
    </div>
  );
}
