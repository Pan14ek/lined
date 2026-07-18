/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_MSW: string;
  /** When 'true', each feature's api/index.ts serves ./dev (in-module mock data) instead of ./prod (real ky requests). */
  readonly VITE_USE_MOCKS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
