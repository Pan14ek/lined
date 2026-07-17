interface LobbyLoadStatesProps {
  loadingTestId: string;
}

/** Skeleton shown while a lobby is loading, shared by LobbyPage and LobbySettingsPage. */
export function LobbyLoadingState({ loadingTestId }: LobbyLoadStatesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="h-24 animate-pulse rounded-xl bg-white" data-testid={loadingTestId} />
      <div className="mt-4 h-10 w-64 animate-pulse rounded-lg bg-white" />
    </div>
  );
}

/** "Not found" message shown when a lobby is missing or inaccessible, shared by LobbyPage and LobbySettingsPage. */
export function LobbyNotFoundState() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <p className="text-sm text-text-secondary">
        Lobby not found. It may have been deleted, or you may not have access to it.
      </p>
    </div>
  );
}
