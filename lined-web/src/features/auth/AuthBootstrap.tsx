import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { initializeCsrf, refreshAccessToken } from '@/lib/apiClient';
import { useAuthStore } from '@/store/auth';
import { getCurrentUser } from '@/features/users/api';
import { QUERY_KEYS } from '@/features/users/lib/constants';
import { clearClientAuthentication } from './sessionCleanup';

let bootstrapInFlight: Promise<void> | null = null;

const bootstrap = (queryClient: ReturnType<typeof useQueryClient>): Promise<void> => {
  if (bootstrapInFlight) return bootstrapInFlight;
  bootstrapInFlight = initializeCsrf()
    .then(() => refreshAccessToken())
    .then(() => getCurrentUser())
    .then((user) => {
      queryClient.setQueryData(QUERY_KEYS.currentUser, user);
    })
    .then(() => undefined)
    .catch(() => {
      clearClientAuthentication(queryClient);
      useAuthStore.getState().finishBootstrap();
    })
    .finally(() => {
      bootstrapInFlight = null;
    });
  return bootstrapInFlight;
};

export const AuthBootstrap = ({ children }: { children: React.ReactNode }) => {
  const status = useAuthStore((state) => state.status);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === 'bootstrapping') void bootstrap(queryClient);
  }, [queryClient, status]);

  if (status === 'bootstrapping') {
    return <div role="status">Loading…</div>;
  }
  return children;
};
