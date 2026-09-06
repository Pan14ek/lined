import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import { USE_MOCKS } from '@/lib/apiClient';
import { assertMocksDisabledInProduction } from '@/lib/mockGuard';
import { App } from './App';

const ENABLE_MSW = import.meta.env.VITE_ENABLE_MSW === 'true';

const enableMocking = async () => {
  assertMocksDisabledInProduction({ prod: import.meta.env.PROD, enableMsw: ENABLE_MSW, useMocks: USE_MOCKS });
  if (!ENABLE_MSW) {
    return;
  }
  const { worker } = await import('./test/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
