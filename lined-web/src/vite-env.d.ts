/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_MSW: string;
  /** When 'true', each feature's api/index.ts serves ./dev (in-module mock data) instead of ./prod (real ky requests). */
  readonly VITE_USE_MOCKS: string;
  /** Artificial latency (ms) added to MSW GET handlers, so skeletons are visible in dev. Unset/0 = off; skipped in test mode since Vite doesn't load .env.local there. */
  readonly VITE_MOCK_DELAY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
