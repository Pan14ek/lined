import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import { App } from './App';

const enableMocking = async () => {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
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
