import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { defaultQueryRetry } from '@/lib/queryRetry';
import { router } from './router';
import { useThemeSync } from './hooks/useThemeSync';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: defaultQueryRetry,
    },
  },
});

export const App = () => {
  useThemeSync();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
