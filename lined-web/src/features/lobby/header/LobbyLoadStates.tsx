import { useTranslation } from 'react-i18next';

interface LobbyLoadStatesProps {
  loadingTestId: string;
}

export const LobbyLoadingState = ({ loadingTestId }: LobbyLoadStatesProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="h-24 animate-pulse rounded-xl bg-surface" data-testid={loadingTestId} />
      <div className="mt-4 h-10 w-64 animate-pulse rounded-lg bg-surface" />
    </div>
  );
}

export const LobbyNotFoundState = () => {
  const { t } = useTranslation('lobby');
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <p className="text-sm text-text-secondary">
        {t('loadStates.notFound')}
      </p>
    </div>
  );
}
